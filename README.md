# enhancer_master
web gui + node.js master controls for slave arduino boards for enhancer, for Come Up To My Room, 2018.

Note: 
In the git repo I updated the git working tree for `pubnub_config.json` + `pubnub_config.txt`  so i can store local enviroment vars in the file locally but still have the file apart of the the repo... http://stackoverflow.com/questions/4348590/how-can-i-make-git-ignore-future-revisions-to-a-file 

add file to skip working tree
`git update-index --skip-worktree pubnub_config.json pubnub_config.txt`

add files back to not skip from working tree
`git update-index --no-skip-worktree pubnub_config.json pubnub_config.txt`