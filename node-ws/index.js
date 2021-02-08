#!/usr/bin/env node
const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const fs = require('fs');
const app = express();
const readline = require('readline');
const Minio = require('minio');
const amqp = require('amqplib/callback_api');

// Enable file uploading.

// https://i.ibb.co/L5mZBmg/car.jpg - car image example to use in Express WS.

app.use(fileUpload({
    createParentPath: true,
    limits: {
        fileSize: 3 * 1024 * 1024 * 1024 // Max file upload size is 3MB
    }
}));

// Add other middleware.

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(morgan('dev'));
app.use(express.static('data-upload'));

// Start app

console.log('\nRoot folder name of the project is "plate-recognition".');

console.log('\nTwo end data points for a car are the following: /car/entry and /cat/exit.');

const port = process.env.PORT || 3000;

app.listen(port, () =>
    console.log(`\nApp is listening on port ${port}.`)
);

app.get('/', (req, res) => {

    res.send('Two data points: /car/entry and /car/exit.');

});

// Invoke child process to make the application lighter.

let exec = require('child_process').exec, fileDownload; // Downloads the specified image through user input with wget.

function sleep(ms) { // Sleep function to invoke user input after receiving a listen reply from the app.
    return new Promise(resolve => setTimeout(resolve, ms));
}

let rl = readline.createInterface(process.stdin, process.stdout);

function carUpload() { // A function to upload files;
    rl.question("Link: ", function (result) {
        if (result.match(/^qu?i?t?$|^ex?i?t?$/i)) {
            choiceMenu();
        } else {
            console.log('\nDownloading from: ' + result + '\n');
            fileDownload = exec('wget ' + result, // https://i.ibb.co/L5mZBmg/car.jpg - car image example.
                function callFiles(error, stdout, stderr) {
                    if (stdout) {
                        console.log('stdout: ' + stdout);
                    }
                    if (stderr) {
                        console.log('stderr:' + stderr + '\033[A');
                        carUpload(this);
                    }
                    if (error) {
                        process.stdout.write('\r');
                        console.log('Incorrect url, try again.\n');
                        carUpload(this);
                    }
                });
        }
    });
}

function choiceMenu() {
    console.log("\nWhat do you wish to do?\n\n1. Download a car image entering/leaving service via Postman.\n2. Upload a car image entering/leaving service.");
    console.log("3. Connect to the RabbitMQ with the amqp protocol and upload the specified image to Minio storage, then send image name as a message.");
    console.log("4. Exit the program.");
    console.log("\nTo start the worker with RabbitMQ, Minio, license identification and nodemailer please do start the OpenALPR container and launch index.js file.");
    console.log("For this demo slovakian car plate was chosen (link): https://i.ibb.co/L5mZBmg/car.jpg\n");
    rl.setPrompt('Select your choice: ');
    rl.prompt();
}

function postImage() {
    app.post('/car/?:entry|exit/', async (req, res) => { // Specify with RegEx whether the selected vehicle enters or leaves the service.
        try {
            if (!req.files) {
                res.send({
                    status: false,
                    message: 'No file uploaded!'
                });
                console.log('No file was uploaded. Please first upload the file using option nr. 1.\n\nReturning to main menu.\n');
                sleep(2000).then(() => {
                    choiceMenu();
                });
            } else {

                // Use the name of the input field (i.e. "car") to retrieve the uploaded file.

                // Use the mv() method to place the file in upload directory (i.e. "data-upload").

                let car = req.files['car'];

                await car.mv('./data-upload/' + car.name);

                console.log('Car was successfully uploaded to the ./plate-recognition/node-ws/data-upload/ folder.\n');

                // Send response.

                res.send({
                    status: true,
                    message: 'File is uploaded!',
                    data: {
                        name: car.name,
                        mimetype: car.mimetype,
                        size: car.size
                    }
                });

                const path = './';

                let regex = new RegExp("\.(gif|jpe?g|tiff?|png|webp|bmp)"); // Filter out all image extensions to delete and image after uploading it to a server.

                fs.readdirSync(path)
                    .filter(f => regex.test(f))
                    .map(f => fs.unlinkSync(path + f))

                console.log('Deleted image from ./plate-recognition/node-ws folder as we already have it stored in data-uploads.\n');
                sleep(3000).then(() => {
                    choiceMenu();
                });
            }
        } catch (err) {
            res.status(500).send(err);
        }
    });
}

let minioClient = new Minio.Client({
    endPoint: 'localhost',
    port: 9000, // Check if port 9000 is allowed on your system, otherwise use 'sudo ufw allow' command un Linux or configure it in a different way on other OS.
    useSSL: false,
    accessKey: 'minioadmin',
    secretKey: 'minioadmin'
});

function minioRabbitPut() {

    amqp.connect('amqp://127.0.0.1:5672', function (err, connection) { // login:pw - guest:guest
        if (err) {
            throw err;
        }
        connection.createChannel(function (e, channel) {
            if (e) {
                throw e;
            }

            console.log("RabbitMQ channel created.\n");

            let queue = 'car-queue';

            rl.question("Please create the name of the image to upload to the bucket (include .jpg or any other format): ", function (image) {

                console.log();

                if (image.match(/\.(gif|jpe?g|tiff?|png|webp|bmp)/i)) {

                    rl.question("PLease enter the path to the data-upload folder to take the image from ('./data-upload/car.jpg'): ", function (path) {

                        if (path.match(/.\/data-upload\/[0-9a-zA-Z]+\.(gif|jpe?g|tiff?|png|webp|bmp)/i)) {

                            minioClient.fPutObject('cars', image, path, function (err, etag) {

                                if (err) {
                                    console.log();
                                    console.log(err, etag);
                                    connection.close();
                                    process.exit(1);

                                } else {
                                    console.log('\nFile uploaded successfully.');

                                    let data = {"image": image};

                                    let msg = JSON.stringify(data);

                                    channel.assertQueue(queue, {durable: true});
                                    channel.sendToQueue(queue, Buffer.from(msg), {persistent: true});
                                    console.log("\n[x] Sent %s", msg);

                                    (setTimeout(function () {
                                        connection.close();
                                        choiceMenu();
                                    }, 1500));
                                }
                            });

                        } else {
                            console.log('\nIncorrect path or image name specified, returning to the main menu.');
                            connection.close();
                            sleep(1000).then(() => {
                                choiceMenu();
                            });
                        }
                    });
                } else {
                    console.log('\nIncorrect image extension, returning back to the menu.');
                    connection.close();
                    sleep(1000).then(() => {
                        choiceMenu();
                    });
                }
            });
        });
    });
}

function minioCreate() {

    // Make a bucket called cars.

    minioClient.makeBucket('cars', 'eu-riga', function (err) {

        if (err) return console.log(err)

        console.log('Bucket created successfully.\n');

        // Using fPutObjectAPI upload your file to the bucket cars.

        minioRabbitPut();

    });
}

function minioDelete() { // For some reason minioClient.removeObjects doesn't work due to listObjects method not recognizable in the Node.js, probably a Minio bug, otherwise there would be less code.
    console.log();
    rl.question("Name of the picture inside the bucket: ", function (imageName) {
        if (imageName.match(/\.(gif|jpe?g|tiff?|png|webp|bmp)/i)) {
            minioClient.removeObject('cars', imageName, function (err) {
                if (err) {
                    console.log('\nUnable to remove the selected object. Check if the name of the image is written correctly. Returning to the main menu.\n\n', err);
                } else console.log('\nRemoved the object inside the bucket.');
            })
            minioClient.removeBucket('cars', function (err) {
                if (err) {
                    console.log('\nUnable to remove the bucket. Check if you have any additional images inside the bucket. You can retry accessing this option through the main menu.');
                    sleep(1500).then(() => {
                        choiceMenu();
                    });
                } else {
                    console.log('\nBucket removed successfully.');
                    sleep(1500).then(() => {
                        choiceMenu();
                    });
                }
            });
        } else {
            console.log('\nIncorrect image extension, returning back to the menu.');
            sleep(1000).then(() => {
                choiceMenu();
            });
        }
    });
}

function minioCheck() {
    minioClient.bucketExists('cars', function (err, exists) { // Check whether you have already created the bucked or not. If you have, delete it manually from the server on http://localhost:9000 or via console input.
        if (err) {
            return console.log(err)
        }
        if (exists) {
            console.log('\nBucket exists.\n');
            rl.question("Upload more images?: ", function (answer) {
                if (answer.match(/^y(es)?$/i)) {
                    console.log();
                    minioRabbitPut();
                } else if (answer.match(/^n(o)?$/i)) {
                    console.log();
                    rl.question("Delete bucket?: ", function (answer) {
                        if (answer.match(/^y(es)?$/i)) {
                            minioDelete();
                        } else if (answer.match(/^n(o)?$/i)) {
                            console.log('\nReturning back to the main menu.');
                            sleep(1500).then(() => {
                                choiceMenu();
                            });
                        } else {
                            console.log('\nWrong option. Returning back to the main menu.');
                            sleep(1500).then(() => {
                                choiceMenu();
                            });
                        }
                    });
                } else {
                    console.log('\nIncorrect option, returning back to the menu.');
                    sleep(1500).then(() => {
                        choiceMenu();
                    });
                }
            });
        } else {
            console.log('\nBucket does not exist.\n');
            minioCreate();
        }
    });
}

(async () => {
    await port;
    choiceMenu()
})();

rl.on('line', function (choice) {
    if (choice === "1") {
        console.log('\nPlease specify the link you want to download the picture from, then upload it to the server via Postman (option 2). It the response takes too long, simply press ctrl+c to get back to the choice menu.\n');
        carUpload();
    } else if (choice === "2") {
        console.log('\nAwaiting for Postman..\n');
        postImage();
    } else if (choice === "3") {
        console.log("\nMinio and RabbitMQ clients activated.");
        minioCheck();
    } else if (choice === "4") {
        console.log("\nExiting the program, goodbye.");
        rl.close();
    } else {
        console.log("\nWrong input, please enter the correct number.\n");
        rl.prompt();
    }
}).on('close', function () {
    rl.removeAllListeners();
    process.exit(0);
}).on('SIGINT', () => {
    rl.question('Are you sure you want to exit from the program? Enter n(o) to get back to the choice menu: ', (answer) => {
        if (answer.match(/^y(es)?$/i)) {
            console.log('\nTerminating program.');
            rl.close();
            process.exit(0);
        } else if (answer.match(/^n(o)?$/i)) {
            console.log('\nReturning back to the menu..');
            sleep(1500).then(() => {
                choiceMenu();
            });
        } else {
            console.log('\nWrong option, returning back to the menu..');
            sleep(1500).then(() => {
                choiceMenu();
            });
        }
    });
});