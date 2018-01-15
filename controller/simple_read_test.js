/* eslint-disable node/no-missing-require */
'use strict';

// Open event example
const SerialPort = require('serialport');
const port = new SerialPort('/dev/cu.usbmodem1411');

const parsers = SerialPort.parsers;


const parser = new parsers.Readline({
  delimiter: '\r\n'
});

port.pipe(parser);

parser.on('data', console.log);


// port.on('open', () => {
//   console.log('Port Opened');
// });

// port.write('main screen turn on', (err) => {
//   if (err) { return console.log('Error: ', err.message) }
//   console.log('message written');
// });

// port.on('data', (data) => {
//   /* get a buffer of data from the serial port */
//   console.log(data.toString());
// });