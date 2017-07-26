var c = require('chalk'),
    validateip = require('validate-ip'),
    condenseWhitespace = require('condense-whitespace'),
    _ = require('underscore'),
    async = require('async'),
    spawn = require('child_process').spawn,
    fs = require('fs'),
    config = require('./config'),
    pmacctdProcess = null,
    pcapFilter = null,
    pmacctdProcesses = {};


var processTopTalkers = function(direction, topTalkers) {
    topTalkers = condenseWhitespace(topTalkers).split('\n').filter(function(i) {
        return i.split(' ').length == 3 && validateip(i.split(' ')[0]);
    }).map(function(i) {
        return {
            ip: i.split(' ')[0],
            packets: +i.split(' ')[1],
            bytes: +i.split(' ')[2],
        };
    });
    topTalkers = {
        packets: _.sortBy(topTalkers, 'packets').reverse().slice(0, config.listLimit),
        bytes: _.sortBy(topTalkers, 'bytes').reverse().slice(0, config.listLimit),
    };
    console.log(direction, topTalkers);
};

process.on('exit', function() {
    _.each(pmacctdProcesses, function(pmacctdProcess) {
        console.log(c.yellow('\nKilling pmacctd child process with pid ' + c.red.bgWhite(pmacctdProcess.pid)));
        pmacctdProcess.kill();
    });
});
var DIRECTION = 'src';
_.each(config.localNetworks, function(net, index) {
    if (index > 0)
        pcapFilter += ' or ';
    pcapFilter += 'dst net ' + net;
});
var pmArgs_in = '-i ' + config.interface + ' -P print -r ' + config.interval + ' -c ' + DIRECTION + '_host ' + pcapFilter;

pcapFilter = '';
_.each(config.localNetworks, function(net, index) {
    if (index > 0)
        pcapFilter += ' or ';
    pcapFilter += 'src net ' + net;
});
var pmArgs_out = '-i ' + config.interface + ' -P print -r ' + config.interval + ' -c ' + DIRECTION + '_host ' + pcapFilter;


pmacctdProcesses.in = spawn(config.pmacctd, pmArgs_in.split(' '));
pmacctdProcesses.in.on('exit', function(code) {
    console.log('pmacctd exited with code', code);
});
pmacctdProcesses.in.stdout.on('data', function(data) {
    processTopTalkers('in', data.toString());
});
pmacctdProcesses.in.stderr.on('data', function(data) {});

pmacctdProcesses.out = spawn(config.pmacctd, pmArgs_out.split(' '));
pmacctdProcesses.out.on('exit', function(code) {
    console.log('pmacctd exited with code', code);
});
pmacctdProcesses.out.stdout.on('data', function(data) {
    processTopTalkers('out', data.toString());
});
pmacctdProcesses.out.stderr.on('data', function(data) {});