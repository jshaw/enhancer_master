# enhancer_master
web gui + node.js master controls for slave arduino boards for enhancer, for Come Up To My Room, 2018.

Note: 
In the git repo I updated the git working tree for `pubnub_config.json` + `pubnub_config.txt`  so i can store local enviroment vars in the file locally but still have the file apart of the the repo... http://stackoverflow.com/questions/4348590/how-can-i-make-git-ignore-future-revisions-to-a-file 

add file to skip working tree
`git update-index --skip-worktree pubnub_config.json pubnub_config.txt`

add files back to not skip from working tree
`git update-index --no-skip-worktree pubnub_config.json pubnub_config.txt`

#### Running on Raspberry pi instructions

https://www.pubnub.com/blog/2015-07-21-getting-started-raspberry-pi-2-pubnub-c-programming-language/
https://github.com/emersonmello/doorlock_raspberrypi/issues/1

sudo apt-get update
sudo apt-get install libevent-dev libjson0-dev libcurl4-openssl-dev libssl-dev
** remove libjson0-dev

sudo apt-get install libjson-c-dev


using pm2, log files are located in the dir: ~/.pm2/logs/