const async = require('async')
const request = require('request')
const requestSync = require('sync-request')
const chalk = require('chalk')
const jsonfile = require('jsonfile')
const ProgressBar = require('progress');
const _ = require('lodash')

var markerData = []

/**
 * we are sucking data provided by Qlue
 */
const urlMarker = 'http://services.qluein.org/qluein_marker_v3.php'

/**
 * params: pid
 */
const urlListHistoryProgress = 'http://services.qluein.org/web_list_history_progress.php?pid='

/**
 * sucker entry point
 */
console.log(`fetching started (${chalk.green(new Date())})`);
console.log('retrieving Qlue report data...')
request(urlMarker, function(err, res, body) {
    if (err) {
        console.log(chalk.red('error fetching data'))
    }

    // filter cases by "complete" status
    markerData = JSON.parse(body)

    var completeCase = markerData.filter(x=>x.profile.detail.status === "complete")
    var inProgressCase = markerData.filter(x=>x.profile.detail.status === "process")
    var pendingCase = markerData.filter(x=>x.profile.detail.status === "wait")

    // merge complete case data with completion history data
    console.log('processing and merging...')
    var bar = new ProgressBar('[:bar] (:percent) ', {
        total:completeCase.length,
        complete: '=',
        incomplete: ' '
    })
    completeCase.map(function(x) {
        var o = x
        var history = JSON.parse(requestSync('GET', urlListHistoryProgress+x.id).body.toString())
        o.follow_up = history
        bar.tick()
        return o
    })

    console.log(`complete case: ${completeCase.length}`);
    console.log(`in-progress case: ${inProgressCase.length}`);
    console.log(`pending case: ${pendingCase.length}`);
    console.log(`total case: ${markerData.length}`);
    console.log(`fetching finished (${chalk.green(new Date())})`);

    // var filename = "data/" + (new Date()) + ".json"
    var filename = "data/latest.json"

    // save filtered data
    jsonfile.writeFile(filename, completeCase, function(err) {
        if (err) {
            console.log(chalk.red('error writing file'))
        }
        console.log('data saved to ' + chalk.yellow(filename));
    })
})
