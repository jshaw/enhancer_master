// var colors;
// var texts;
var controls;

var pubnub;
var pubnub_config;
var pub;
var sub;

var pubnub_logging;

// this is a zero index count
var num_of_panels = 2;

var function_control_list = [
    'stop',
    'start',
    'all_same_sweep',
    'all_same_noise',
    'hsb_saturation_sweep',
    'hsb_saturation_noise',
    'animate_hsb_sweep',
    'animate_hsb_noise',
    'hue_noise_sweep',
    'hue_noise_noise',
    'random_hue_noise_saturation',
    'reset',
    'reset_with_pause'];

var current_timer = "";
var last_panel_0 = "";
var last_panel_1 = "";

function preload() {

    loadStrings('../pubnub_config.txt', loadPubNubConfig);
}

function setup() { 
    createCanvas(400, 400);

    controls = new Control();
    var gui = new dat.GUI({width:520});
    gui.remember(controls);

    var f = gui.addFolder("Ransomize");
    f.add(controls, 'randomize').onChange(function(value){
        console.log("random val change: ", value);
        controls.publishConfig.message = {
            message : "control_randomize_toggle_" + value
        };

        controls.publish();
    });

    f.add(controls, 'randomize_timer')
        .min(0)
        .max(600000)
        .step(1000)
        .onFinishChange(function(value){
            lastAutoRestDelay = value;
            console.log("lastAutoRestDelay: " + lastAutoRestDelayLong);

            console.log("controls:" + controls.publishConfig);

            controls.publishConfig.message = {
                message : "control_randomize_timer_" + value
            };

            controls.publish();

        });

    f.add(controls, 'pause_timer')
        .min(0)
        .max(60000)
        .step(1000)
        .onFinishChange(function(value){
            lastAutoRestDelayShort = value;
            console.log("lastAutoRestDelayShort: " + lastAutoRestDelayShort);

            controls.publishConfig.message = {
                message : "control_pause_timer_" + value
            };

            controls.publish();

        });

    f.add(controls, 'data_logging');
    f.add(controls, 'reset_serial_ports');

    var f0 = gui.addFolder("Global");
    var f1 = gui.addFolder("Arduino One");
    var f2 = gui.addFolder("Arduino Two");

    var i;
    for(i = 0; i <= num_of_panels; i++){
        _.forEach(function_control_list, function(value, key){
            var suffix = "__f" + (i - 1);

            if(i == 0){
                f0.add(controls, value);
            } else if(i == 1){
                // f1.add(controls, value + suffix);
            } else if(i == 2){
                // f2.add(controls, value + suffix);
            }
        });
    };

    f.open();
    f0.open();

} 

var random_mode = true;
var current_millis = 0;

///////
var lastAutoRest = 0;


// ideal would be run for 900000 (15 min)
// rest for 30000 (30 seconds)

// NOTE TODO:
//////////////
// put in a test thing so that if testing the timer is super tiny... other wise
// its the normal size larger numbers

// 1 minute
var lastAutoRestDelayShort = 60000;
// var lastAutoRestDelayShort = 5000;

// 5 minutes
// var lastAutoRestDelay = 300000;
var lastAutoRestDelay = lastAutoRestDelayShort;

// these two vars need to be the same
var lastAutoRestDelayLong = 300000;
// var lastAutoRestDelayLong = 10000;


var last_active_mode = "noise";

function draw() { 

    random_mode = controls.randomize;
    data_logging = controls.data_logging;

    current_millis = millis();
    
    // would be useful to display on the screen what mode is actually active
    // Also to post the last time data was received from serial ports

}

function loadPubNubConfig(str) {
    pubnub_config = str;

    console.log("pubnub_config: " + pubnub_config);

    initPubNub();
    pubnubDataLogging();
    pubnubModeLogging();
}

function initPubNub(){

    pubnub = new PubNub({
        publishKey : pubnub_config[0].toString(),
        subscribeKey : pubnub_config[1].toString(),
        ssl: true
    });

    console.log("pubnub: ", pubnub);

}

function pubnubDataLogging(){


    pubnub_logging = new PubNub({
        publishKey : pubnub_config[3].toString(),
        subscribeKey : pubnub_config[4].toString(),
        ssl: true
    });
       
    pubnub_logging.addListener({
        status: function(statusEvent) {
            if (statusEvent.category === "PNConnectedCategory") {
                // publishSampleMessage();
            }
        },
        message: function(message) {
            if(data_logging == true){
                console.log("Data Logs: ", message);
            }
        },
        presence: function(presenceEvent) {
            // handle presence
        }
    })      
    
    pubnub_logging.subscribe({
        channels: ['enhancer_control'] 

    });
}

function pubnubModeLogging(){
       
    pubnub.addListener({
        status: function(statusEvent) {
            if (statusEvent.category === "PNConnectedCategory") {
                // publishSampleMessage();
            }
        },
        message: function(message) {
            // if(data_logging == true){
                console.log("Mode! : ", message);
                var mode = message.message;
                outputMode(mode);
            // }
        },
        presence: function(presenceEvent) {
            // handle presence
        }
    })      
    
    pubnub.subscribe({
        channels: ['enhancer_app'] 
    });
}

var mode_display = "";
function outputMode(mode){
    background(255);

    console.log(typeof mode);
    console.log(typeof mode.message);

    if(typeof mode == 'string'){

        if(mode.indexOf("time_") != -1){
            // namespace_current_time_last_message_from_panel_0/last_message_from_panel_1/last_message_from_panel_2
            var re = /time_/gi;
            var newstr = mode.replace(re, "");
            var arrayOfTimes = newstr.split("/");
            current_timer = "Current Timer: " + arrayOfTimes[0];
            last_panel_0 = "Last Panel 0: " + arrayOfTimes[1];
            last_panel_1 = "Last Panel 1: " + arrayOfTimes[2];

        } else {
            if(mode.indexOf("control_") != 0){
                mode_display = "mode: " + mode;
            }
        }
        
    } else {
        var tmp_md = mode.message;
        if(tmp_md.indexOf("control_") != 0){
            mode_display = "mode: " + tmp_md;
        }
    }

    textSize(32);
    text(mode_display, 10, 30);
    text(current_timer, 10, 60);
    text(last_panel_0, 10, 90);
    text(last_panel_1, 10, 120);
}


function Control() {
    this.publishConfig = {
        channel : "enhancer_app",
    };

    console.log("this.publishConfig: " + this.publishConfig);

    this.randomize = true;
    this.randomize_timer = lastAutoRestDelayLong;
    this.pause_timer = lastAutoRestDelayShort;

    this.data_logging = false;

    this.reset_serial_ports = (function(){
        console.log("reset_serial_ports");
        this.publishConfig.message = {
            message : "reset_serial_ports"
        };

        this.publish();
    });

    this.reset = function(){
        console.log("reset");
        

        this.publishConfig.message = {
            message : "reset"
        };

        this.publish();
    }

    this.reset_with_pause = function(){
        console.log("reset_with_pause");
        

        this.publishConfig.message = {
            message : "reset_with_pause"
        };

        this.publish();
    }

    this.start = function(){
        console.log("start");
        

        this.publishConfig.message = {
            message : "start"
        };

        this.publish();
    }

    this.stop = function(){
        console.log("stop");

        this.publishConfig.message = {
            message : "stop"
        };

        this.publish();
    }

    this.all_same_sweep = function(){
        console.log("all_same_sweep");
        

        this.publishConfig.message = {
            message : "all_same_sweep"
        };

        this.publish();
    }

    this.all_same_noise = function(){
        console.log("all_same_noise");
        

        this.publishConfig.message = {
            message : "all_same_noise"
        };

        this.publish();
    }

    this.hsb_saturation_sweep = function(){
        console.log("hsb_saturation_sweep");

        this.publishConfig.message = {
            message : "hsb_saturation_sweep"
        };

        this.publish();
    }

    this.hsb_saturation_noise = function(){
        console.log("hsb_saturation_noise");

        this.publishConfig.message = {
            message : "hsb_saturation_noise"
        };

        this.publish();
    }

    this.animate_hsb_sweep = function(){
        console.log("animate_hsb_sweep");

        this.publishConfig.message = {
            message : "animate_hsb_sweep"
        };

        this.publish();
    }

    this.animate_hsb_noise = function(){
        console.log("animate_hsb_noise");

        this.publishConfig.message = {
            message : "animate_hsb_noise"
        };

        this.publish();
    }

    this.hue_noise_sweep = function(){
        console.log("hue_noise_sweep");

        this.publishConfig.message = {
            message : "hue_noise_sweep"
        };

        this.publish();
    }

    this.hue_noise_noise = function(){
        console.log("hue_noise_noise");

        this.publishConfig.message = {
            message : "hue_noise_noise"
        };

        this.publish();
    }

    this.random_hue_noise_saturation = function(){
        console.log("random_hue_noise_saturation");

        this.publishConfig.message = {
            message : "random_hue_noise_saturation"
        };

        this.publish();
    }

    // // ========================
    // // ========================

    // // need to refactor after here
    // // Panel 1
    // this.start__f0 = function(){
    //     console.log("start__f0");

    //     this.publishConfig.message = {
    //         message : "start__f0"
    //     };

    //     this.publish();
    // }

    // this.stop__f0 = function(){
    //     console.log("stop__f0");

    //     this.publishConfig.message = {
    //         message : "stop__f0"
    //     };

    //     this.publish();
    // }

    // this.sweep__f0 = function(){
    //     console.log("sweep__f0");

    //     this.publishConfig.message = {
    //         message : "sweep__f0"
    //     };

    //     this.publish();
    // }

    // this.noise__f0 = function(){
    //     console.log("noise__f0");
        

    //     this.publishConfig.message = {
    //         message : "noise__f0"
    //     };

    //     this.publish();
    // }

    // this.reset__f0 = function(){
    //     console.log("reset");
        

    //     this.publishConfig.message = {
    //         message : "reset__f0"
    //     };

    //     this.publish();
    // }

    // this.reset_with_pause__f0 = function(){
    //     console.log("reset_with_pause");
        

    //     this.publishConfig.message = {
    //         message : "reset_with_pause__f0"
    //     };

    //     this.publish();
    // }


    // // panel 2
    // // ============================
    // this.start__f1 = function(){
    //     console.log("start__f1");

    //     this.publishConfig.message = {
    //         message : "start__f1"
    //     };

    //     this.publish();
    // }

    // this.stop__f1 = function(){
    //     console.log("stop__f1");

    //     this.publishConfig.message = {
    //         message : "stop__f1"
    //     };

    //     this.publish();
    // }

    // this.sweep__f1 = function(){
    //     console.log("sweep__f1");
        

    //     this.publishConfig.message = {
    //         message : "sweep__f1"
    //     };

    //     this.publish();
    // }

    // this.noise__f1 = function(){
    //     console.log("noise__f1");
        

    //     this.publishConfig.message = {
    //         message : "noise__f1"
    //     };

    //     this.publish();
    // }

    // this.reset__f1 = function(){
    //     console.log("reset");
        

    //     this.publishConfig.message = {
    //         message : "reset__f1"
    //     };

    //     this.publish();
    // }

    // this.reset_with_pause__f1 = function(){
    //     console.log("reset_with_pause");
        

    //     this.publishConfig.message = {
    //         message : "reset_with_pause__f1"
    //     };

    //     this.publish();
    // }

    this.publish = function(){

        console.log("remember to put the publish back into the app");

        // this sets the last / previous mode that was selected
        var tmp_msg = this.publishConfig.message.message;
        if(tmp_msg != 'reset_with_pause' 
            && tmp_msg != 'reset' 
            && tmp_msg != 'measure'
            && tmp_msg != 'stop'
            && tmp_msg != 'measure_react'
            && tmp_msg != 'reset_serial_ports'){
         
                last_active_mode = this.publishConfig.message.message;
                console.log(">>>> " + last_active_mode);
        }

        console.log("whaaaaa; ", this.publishConfig)

        pubnub.publish(this.publishConfig, function(status, response) {
            console.log(status, response);
        });
    }
}
