var _ = require('lodash');
var SerialPort = require("serialport");
var PubNub = require('pubnub');
var pubnub;
var pubnub_installation;

var jsonfile = require('jsonfile');
var file = "./../pubnub_config.json";
var json;

var control_val;

var device = "mac";
// var device = "pi";


var current_mode = 'noise_react';
var previous_mode = 'stop';
var last_active_mode = "noise_react";

// to help with sending stop once on random mode
var first_stopped = false;


// taken from the gui code. The functionality needs to be added here,
// to allow for not always having to maintaine and have active browsers.

// 1 minute
var lastAutoRestDelayShort = 60000;
// 5 seconds
// var lastAutoRestDelayShort = 5000;

// 5 minutes
// var lastAutoRestDelay = 300000;
var lastAutoRestDelay = lastAutoRestDelayShort;

// these two vars need to be the same
var lastAutoRestDelayLong = 300000;

// var lastAutoRestDelayLong = 10000;

var ports = [];

var modeToKeyMap = {
    'start': 'g',
    'stop': 's',
    'stop_rainbow': '0',
    'all_same_sweep': '1',
    'all_same_noise': '2',
    'hsb_saturation_sweep': '3',
    'hsb_saturation_noise': '4',
    'animate_hsb_sweep': '5',
    'animate_hsb_noise': '6',
    'hue_noise_sweep': '7',
    'hue_noise_noise': '8',
    'random_hue_noise_saturation': '9',
    'reset': '-',
    'reset_with_pause': '='
};

var randomize_function_list = [
    'stop_rainbow',
    'all_same_sweep',
    'all_same_noise',
    'hsb_saturation_sweep',
    'hsb_saturation_noise',
    'animate_hsb_sweep',
    'animate_hsb_noise',
    'hue_noise_sweep',
    'hue_noise_noise',
    'random_hue_noise_saturation'
];

// var randomize_function_list = [
//     'all_same_sweep',
//     'all_same_noise'
// ];


var last_message_p0 = 0;
var last_message_p1 = 0;

jsonfile.readFile(file, function(err, obj) {
    console.dir(obj);
    json = obj;

    var json_web_control = json.web_control;
    var json_installation = json.installation;

    pubnub = new PubNub({
        subscribeKey: json_web_control.subKey,
        publishKey: json_web_control.pubKey,
        secretKey: json_web_control.secretKey,
        ssl: true
    });

    pubnub_installation = new PubNub({
        subscribeKey: json_installation.subKey,
        publishKey: json_installation.pubKey,
        secretKey: json_installation.secretKey,
        ssl: true
    });

    initPubNub();
    initPubNubInstallation();

});


var startUpSequence = true;

function initApp(){
    listPorts();
}

function listPorts(){
    SerialPort.list(function (err, ports) {
        ports.forEach(function(port) {
            console.log(port.comName);
            console.log(port.pnpId);
            console.log(port.manufacturer);
            console.log("=====");
        });
    });

    // TODO: Put Back In!
    // When not writing tests without arduinos connected to computer
    // ==================
    initPorts();

}

function startBootScan(){
        // this makes sure that something happens when we boot up.
    if(startUpSequence == true){
        var method_name = randomize_function_list[Math.floor(Math.random() * randomize_function_list.length)];
        console.log("method_name: " + method_name);
        globalControl(method_name);
        startUpSequence = false;
        console.log("startUpSequence: " + startUpSequence);
    }

}



// ToDO, get actual port names for the arduinos that are going to be used
// when plugged into port
// Todo, create ports via loop of usbmodem port ID
// Todo, create ports via loop of usbmodem port ID
// Todo, create ports via loop of usbmodem port ID
// ==========


if(device == 'mac'){
    // Mac
    // var portsLookup = [14111, 14121];
    var portsLookup = [1411];
    // var portsLookup = [14111, 14121, 14131, 14141];
    var usb = '/dev/cu.usbmodem';

} else if (device == 'pi'){
    // Raspberry Pi
    var portsLookup = [1, 2];
    var usb = '/dev/ttyACM';

}

var globalBaudRate = 115200;

function initPorts(){

    _.forEach(portsLookup, function(value, key){
        var serialPortConnect = usb + value;
        ports[key] = new SerialPort(serialPortConnect, {
            parser: SerialPort.parsers.readline('\n'),
            baudRate: globalBaudRate
        });
    });

    initPortUpdates();

}

// as a reminder, it might make sense to have these ports as another pupnub instance.
// this way there's two listenier for incomming data and ougoing control of the arduinos / microcontrolers
function initPortUpdates(){

    _.forEach(ports, function(value, key){
        ports[key].on('data', function (data) {
            // it is here that the data will be sent from 
            // each microcontroller and it will need to be sent to Pubnub
            // console.log('Data: ' + data);
            publishInstallationData(data);
        });

        ports[key].on('error', function(err) {
            console.log(arguments);
            console.log('Error: ', err.message);

            // would be good, that if there's an error, it auto closes all of the ports,
            // then restarts them
            if(ports[key].isOpen()){
                ports[key].close();
            }
            resetSerialPorts();
        });
    });
}

var current_timer = 0;
var random_mode = true;
var lastAutoRest = 0;

var global_timer = setInterval(function() {
    current_timer += 33;

    if(current_timer > 1500 && current_timer < 2000){
        startBootScan();
    }

    if ((current_timer - lastAutoRest) > lastAutoRestDelay) {

        lastAutoRest = current_timer;

        if(random_mode ==  true){

            // console.log("RANDOM VALUE = TRUE!");

            if(lastAutoRestDelay == lastAutoRestDelayShort){

                lastAutoRestDelay = lastAutoRestDelayLong;
                var method_name = randomize_function_list[Math.floor(Math.random() * randomize_function_list.length)];
                
                // TODO: write this to the dom
                console.log("method_name: ", method_name);

                globalControl(method_name);
                publishMode(method_name);

                last_active_mode = method_name;

                previous_mode = current_mode;
                current_mode = method_name;
                
                
            } else if(lastAutoRestDelay == lastAutoRestDelayLong){
                lastAutoRestDelay = lastAutoRestDelayShort;

                // Switched this to reset serial ports to help try and prevent a buffer issue
                // filling up or something... this will hopefully prevent some potential
                // arduino crashes or glitches

                // TODO: write this to the dom
                // controls.stop();


                // resetSerialPorts();
                globalControl('stop');
                publishMode('stop');
            }

        } else {

            // console.log("RANDOM VALUE = FALSE!");

            if(lastAutoRestDelay == lastAutoRestDelayShort){
                lastAutoRestDelay = lastAutoRestDelayLong;

                // var tmp_function = window["controls"]; 
                // tmp_function[last_active_mode]();
                globalControl(last_active_mode);
                method_name(last_active_mode);
                
            } else if(lastAutoRestDelay == lastAutoRestDelayLong){
                lastAutoRestDelay = lastAutoRestDelayShort;

                // console.log('reset serial');
                resetSerialPorts();
            }

        }
    }

    // every 20 minutes reboot
    if( current_timer > 1200000){
        // only exit if the average time of not working is 8 minutes
        process.exit();
    }

}, 33);

// Resets the serial ports by closing them, then reopening them
// ==========================
var stopPromise;
var closePromise;


function globalStop(){
    
    globalControl('stop');
    resolve("Success!");  
}

function closeAllPorts(){
    
    _.forEach(ports, function(value, key){
        ports[key].flush(function(){
            // console.log("close port: " + key);
            // console.log("close port value: " + value);
            // check the arguments that are passed in here
            if(ports[key].isOpen()){
                ports[key].close();
            }

            // on the last loop, resolve the promise,
            // this will cause all the serial ports to re-initiate.
            if(key == (ports.length-1)){
                resolve("Success!");
            }
        });
    });
}

// removed cause of duplicate function
// function resetSerialPorts(){
//     // TODO: Remember to put this back in!
//     //initPorts();
// }


function resetSerialPorts(){

    publishMode("stop");
    
    stopPromise = new Promise((resolve, reject) => { 
        globalControl('stop');
        resolve("Success!");
    });

    closePromise = new Promise((resolve, reject) => { 

        if(ports.length > 0){
            _.forEach(ports, function(value, key){
                ports[key].flush(function(){
                    // console.log("close port: " + key);
                    // console.log("close port value: " + value);
                    // check the arguments that are passed in here
                    if(ports[key].isOpen()){
                        ports[key].close();
                    }

                    // on the last loop, resolve the promise,
                    // this will cause all the serial ports to re-initiate.
                    if(key == (ports.length-1)){
                        resolve("Success!");
                    }
                });
            })
        } else {
            resolve("Success!");
        }
    });


    // when the two promises are complete,
    // reinit the Ports
    Promise.all([stopPromise, closePromise]).then(values => { 
        // console.log("In Promise Resolved All");
        // If init isn't called in setup, this won't get called, meaning that 
        // to debug timing logic only the above init needs to be commented out. This should
        // run fine if it has Arduinos connected
        if(ports.length > 0){
            initPorts();
        }
    });    
}


function initPubNub(){

    pubnub.addListener({
        
        message: function(m) {

            // handle message
            var channelName = m.channel; // The channel for which the message belongs
            var channelGroup = m.subscription; // The channel group or wildcard subscription match (if exists)
            var pubTT = m.timetoken; // Publish timetoken
            var msg = m.message; // The Payload
            var msg_str = msg.message;

            console.log("msg_str: " + msg_str);
            // console.log("Random timer index: ", msg_str.indexOf("control_randomize_timer"));

            if(typeof msg_str !== "undefined"){

                if(msg_str == "reset_serial_ports"){
                    // console.log('reset_serial_ports');
                    resetSerialPorts();

                } else if(msg_str.indexOf("control_randomize_toggle_") >= 0){
                    // add randomize logic
                    var tmp_val = msg_str.lastIndexOf("_");
                    tmp_val = msg_str.substring(tmp_val + 1);

                    // console.log("CURRENT VALUE: ", tmp_val);

                    random_mode = tmp_val;
                } else if(msg_str.indexOf("control_randomize_timer") >= 0){
                    var tmp_val = msg_str.lastIndexOf("_");
                    tmp_val = msg_str.substring(tmp_val + 1);

                    // console.log("tmp_val", tmp_val);

                    lastAutoRestDelayLong = tmp_val;

                } else if(msg_str.indexOf("control_pause_timer") >= 0){
                    var tmp_val = msg_str.lastIndexOf("_");
                    tmp_val = msg_str.substring(tmp_val + 1);

                    lastAutoRestDelayShort = tmp_val;
                    lastAutoRestDelay = lastAutoRestDelayShort;

                
                } else if(msg_str.indexOf("__") == -1){
                    // this means that it is a global control
                    // global control
                    globalControl(msg_str);
                }else {
                    // console.log("get here?");
                    // panelControl(msg_str);
                }
            } else {
                // console.log("UNDEFINED!!!!!!");
                // console.log(m);
                // console.log("||||||||||||||");

                // this is here for debugging
                // publishLastReceivedData();

            }
        },
        presence: function(p) {
            // handle presence
            var action = p.action; // Can be join, leave, state-change or timeout
            var channelName = p.channel; // The channel for which the message belongs
            var occupancy = p.occupancy; // No. of users connected with the channel
            var state = p.state; // User State
            var channelGroup = p.subscription; //  The channel group or wildcard subscription match (if exists)
            var publishTime = p.timestamp; // Publish timetoken
            var timetoken = p.timetoken;  // Current timetoken
            var uuid = p.uuid; // UUIDs of users who are connected with the channel
        },
        status: function(s) {
            // handle status
        }
    });

    pubnub.subscribe({
        channels: ['enhancer_app'],
        withPresence: true // also subscribe to presence instances.
    });
}

function publishMode(data){

    pubnub.publish({
        message: data.trim(),
        channel: 'enhancer_app',
        sendByPost: false, // true to send via post
        storeInHistory: true, //override default storage options
        meta: {
            // publish extra meta with the request
            // "cool": "meta"
        }
    },
    function (status, response) {
        // handle status, response
        console.log("response log: ", arguments);
    });


}

function initPubNubInstallation(){

    pubnub_installation.addListener({
        
        message: function(m) {
            // handle message
            var channelName = m.channel; // The channel for which the message belongs
            var channelGroup = m.subscription; // The channel group or wildcard subscription match (if exists)
            var pubTT = m.timetoken; // Publish timetoken
            var msg = m.message; // The Payload
            //console.log("New Installation Message", m);
          
        },
        presence: function(p) {
            // handle presence
            var action = p.action; // Can be join, leave, state-change or timeout
            var channelName = p.channel; // The channel for which the message belongs
            var occupancy = p.occupancy; // No. of users connected with the channel
            var state = p.state; // User State
            var channelGroup = p.subscription; //  The channel group or wildcard subscription match (if exists)
            var publishTime = p.timestamp; // Publish timetoken
            var timetoken = p.timetoken;  // Current timetoken
            var uuid = p.uuid; // UUIDs of users who are connected with the channel
        },
        status: function(s) {
            // handle status
        }
    });

    pubnub_installation.subscribe({
        channels: ['enhancer_control'],
        withPresence: true // also subscribe to presence instances.
    });
}

function publishInstallationData(data){

    if ( (control_val != "stop") && (data.trim().length > 3)){

        first_stopped == true;

        // console.log("--->>>>>>> data: " + data);
        // console.log("--->>>>>>> data: " + data.trim());
        // console.log(data);

        var panel_id_data = data.charAt(0);

        // typecast to int
        panel_id_data *= 1;

        if(panel_id_data == 0){
            last_message_p0 = current_timer;
        } else if(panel_id_data == 1){
            last_message_p1 = current_timer;
        }

        publishLastReceivedData();

        pubnub_installation.publish({
            message: data.trim(),
            channel: 'enhancer_control',
            sendByPost: false, // true to send via post
            storeInHistory: true, //override default storage options
            meta: {
                // "cool": "meta"
            } // publish extra meta with the request
        },
        function (status, response) {
            // handle status, response
            // console.log("response log: ", arguments);
        });

    } else {
        // console.log("don't send data, it is stopped");
        if(first_stopped == true){
            // console.log("SENT STOP COMMAND");
            globalControl("stop");
        }

    }

}

function publishLastReceivedData(){
    // namespace_current_time_last_message_from_panel_0/last_message_from_panel_1/last_message_from_panel_2
    var timecodes = "time_" + current_timer + "/" + last_message_p0 + "/" + last_message_p1; 
    publishMode(timecodes);
}

function globalControl(msg){

    // assign the passed in message to the control val
    // this will use the loopup table to reference correct key control to pass via serial
    control_val = msg;

    if(msg == "stop"){
        first_stopped = false;
    }

    if(ports.length > 0){

        _.forEach(ports, function(value, key){
            
            // =========================================
            // TODO, bind a function to the port write and for the drain functions so it doesn't need 
            // to be duplicated over and over and over... :/
            // TODO, bind a function to the port write and for the drain functions so it doesn't need 
            // to be duplicated over and over and over... :/
            // TODO, bind a function to the port write and for the drain functions so it doesn't need 
            // to be duplicated over and over and over... :/
            // =========================================
            // console.log("Whats the control_val??? : ");
            // console.log(control_val);
            // console.log("Whats the LOOKUP??? : ");
            // console.log(modeToKeyMap[control_val]);
            

            // console.log("========================");

            // used keymap look up table to reference the control key to the control mode
            ports[key].write(new Buffer(modeToKeyMap[control_val]), function () {
                ports[key].drain(function(){
                    // console.log("start args: ", arguments);
                });
            });

        });
    }
}

function panelControl(msg){
    // var control_val;
    var split = msg.split("__");
    var behaviour = split[0];
    var panel_str = split[1];

    // sets the behaviour control mesage to the control val for reference in lookup map
    control_val = behaviour;

    // this resets only a certain panel to a default or mode
    var panel = panel_str.substring(1);

    // used keymap look up table to reference the control key to the control mode
    ports[panel].write(new Buffer(modeToKeyMap[control_val]), function () {
        ports[panel].drain(function(){
            // console.log("start args: ", arguments);
        });
    });

}

initApp();
