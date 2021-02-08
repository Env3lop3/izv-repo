#!/usr/bin/env node
const nodemailer = require('nodemailer');
const Minio = require('minio');
const amqp = require('amqplib/callback_api');
const readline = require('readline');
let exec = require('child_process').exec;

// noinspection JSUnresolvedFunction
let transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
        user: 'bortovcsgo1@gmail.com',
        pass: 'Bortovcsgo1--'
    }
});

// noinspection JSUnresolvedFunction
let minioClient = new Minio.Client({
    endPoint: 'localhost',
    port: 9000,
    useSSL: false,
    accessKey: 'minioadmin',
    secretKey: 'minioadmin'
});


let rf = readline.createInterface(process.stdin, process.stdout);

let cars = [];

let timeStart;

function plateDetectionEntry() { // Calling RabbitMQ to pull out the image out from a Minio bucket and then count vehicle entry time.

    amqp.connect('amqp://localhost:5672', function (err, connection) { // login:pw - guest:guest
        if (err) {
            throw err;
        }
        // noinspection JSUnresolvedFunction
        connection.createChannel(function (e, channel) {
            if (e) {
                throw e;
            }

            let queue = 'car-queue';
            // noinspection JSUnresolvedFunction
            channel.assertQueue(queue, {
                durable: true
            });

            console.log("\n[*] Waiting for messages in %s. To exit press CTRL+C", queue);

            // noinspection JSUnresolvedFunction
            channel.consume(queue, function (msg) {
                console.log("\n[x] Received %s", msg.content.toString());
                let json_data = JSON.parse(msg.content);
                console.log("\nName is " + json_data.image);

                (setTimeout(function () {
                    connection.close();
                }, 1500));

                rf.question("\nSpecify the name of the image to store in tmp folder: ", function (answer) {

                    if (answer.match(/\.(gif|jpe?g|tiff?|png|webp|bmp)/i)) {

                        // noinspection JSUnresolvedFunction
                        minioClient.fGetObject('cars', json_data.image, `../openalpr-plate/tmp-storage/${answer}`, function (err) {
                            if (err) {
                                return console.log(err)
                            } else {
                                console.log('\nImage retrieved successfully.');

                                exec(`alpr -c eu -p sk -d -j ../openalpr-plate/tmp-storage/${answer}`, function (error, stdout, stderr) {

                                    if (stdout) {

                                        let plateOutput = JSON.parse(stdout.toString());
                                        console.log("\nLicense plate has been detected.\n");
                                        // noinspection JSUnresolvedVariable
                                        console.log("Plate number on entry: " + plateOutput.results[0].plate);
                                        // noinspection JSUnresolvedVariable
                                        cars.push(plateOutput.results[0].plate);
                                        timeStart = new Date().getTime();
                                        console.log("\nTime in: " + timeStart);
                                        // noinspection JSUnresolvedVariable
                                        if (cars.length < 2) {
                                            plateDetectionExit();
                                        }
                                    } else if (error) {
                                        console.log("\nDetection error: " + error)
                                        console.log(stderr);
                                    }
                                })
                            }
                        });
                    } else {
                        console.log("\nAn error occurred while storing image.");
                        process.exit(1);
                    }
                });

            }, {
                noAck: true
            });
        });
    })
}

function plateDetectionExit() { // Doing the same actions, but this time counting exit time

    amqp.connect('amqp://localhost:5672', function (err, connection) { // login:pw - guest:guest
        if (err) {
            throw err;
        }
        // noinspection JSUnresolvedFunction
        connection.createChannel(function (e, channel) {
            if (e) {
                throw e;
            }

            let queue = 'car-queue';
            // noinspection JSUnresolvedFunction
            channel.assertQueue(queue, {
                durable: true
            });

            console.log("\n[*] Waiting for messages in %s. To exit press CTRL+C", queue);

            // noinspection JSUnresolvedFunction
            channel.consume(queue, function (msg) {
                console.log("\n[x] Received %s", msg.content.toString());
                let json_data = JSON.parse(msg.content);
                console.log("\nName is " + json_data.image);

                (setTimeout(function () {
                    connection.close();
                }, 1500));

                rf.question("\nSpecify the name of the image to store in tmp folder: ", function (answer) {

                    if (answer.match(/\.(gif|jpe?g|tiff?|png|webp|bmp)/i)) {

                        // noinspection JSUnresolvedFunction
                        minioClient.fGetObject('cars', json_data.image, `../openalpr-plate/tmp-storage/${answer}`, function (err) {
                            if (err) {
                                return console.log(err)
                            } else {
                                console.log('\nImage retrieved successfully.');

                                exec(`alpr -c eu -p sk -d -j ../openalpr-plate/tmp-storage/${answer}`, function (error, stdout, stderr) {

                                    if (stdout) {
                                        let plateOutput = JSON.parse(stdout.toString());
                                        console.log("\nLicense plate has been detected.\n");
                                        // noinspection JSUnresolvedVariable
                                        console.log("Plate number on exit: " + plateOutput.results[0].plate);
                                        // noinspection JSUnresolvedVariable
                                        cars.push(plateOutput.results[0].plate);
                                        let timeOut = new Date().getTime();
                                        console.log("\nTime out: " + timeOut);
                                        let totaltime = (timeOut - timeStart) / 1000;
                                        console.log("\nTotal time: " + totaltime);

                                        let mailOptions = {
                                            from: 'bortovcsgo1@gmail.com',
                                            to: 'bigfactstest@gmail.com',
                                            subject: 'Sending Email using Node.js',
                                            text: 'Total time spent is: ' + totaltime
                                        };
                                        // noinspection JSUnresolvedFunction
                                        let mail = transporter.sendMail(mailOptions, function (error, info) {
                                            if (error) {
                                                console.log(error);
                                            } else {
                                                console.log('\nEmail sent successfully. Response: ' + info.response);
                                                console.log('\nPlease check g-mail inbox on bigfactstest@gmail.com');
                                                process.exit(0);
                                            }

                                            mail();

                                        });

                                        // else {
                                        //     console.log("\nNot enough array elements to count time.");
                                        //     process.exit(0);
                                        // }

                                    } else if (error) {
                                        console.log("\nDetection error: " + error)
                                        console.log(stderr);
                                    }
                                })
                            }
                        });
                    } else {
                        console.log("\nAn error occurred while storing image.");
                        process.exit(1);
                    }
                });

            }, {
                noAck: true
            });
        });
    })
}

plateDetectionEntry();


