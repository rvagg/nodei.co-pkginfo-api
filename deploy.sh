#!/bin/sh

host=nodei.co

rsync --recursive --times --perms --delete --progress --exclude pkginfo.db/ --exclude node_modules --exclude log ./ nodeico@${host}:/home/nodeico/pkginfo-api/
ssh nodeico@${host} 'mkdir -p /home/nodeico/pkginfo-api/log/ && cd /home/nodeico/pkginfo-api && npm install'
ssh root@${host} 'service pkginfo-api restart'
