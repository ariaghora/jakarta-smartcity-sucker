const async = require('async')
const request = require('request')
const requestSync = require('sync-request')
const chalk = require('chalk')
const jsonfile = require('jsonfile')
const ProgressBar = require('progress');
const path = require('path');
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
console.log(`Operation started (${chalk.green(new Date())})`);
console.log('Retrieving Qlue report data...')
request(urlMarker, function(err, res, body) {
    if (err) {
        console.log(chalk.red('Error fetching data'))
    }

    // filter cases by "complete" status
    markerData = JSON.parse(body)

    var completeCase = markerData.filter(x=>x.profile.detail.status === "complete")
    var inProgressCase = markerData.filter(x=>x.profile.detail.status === "process")
    var pendingCase = markerData.filter(x=>x.profile.detail.status === "wait")
    console.log('All report data retreved. Followings are the statistics:');
    console.log(`Complete case: ${completeCase.length}`);
    console.log(`In-progress case: ${inProgressCase.length}`);
    console.log(`Pending case: ${pendingCase.length}`);
    console.log(`Total case: ${markerData.length}\n`);

    // merge complete case data with completion history data
    console.log('Now processing and merging all report data with follow-up history data.')
    console.log('It takes a while. Enjoy your coffee while waiting.')
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

    // var filename = "data/" + (new Date()) + ".json"
    var filename = "data/latest.json"

    // save filtered data
    jsonfile.writeFile(filename, completeCase, function(err) {
        if (err) {
            console.log(chalk.red('Error writing file'))
        } else {
          console.log('Merging completed. Data saved to ' + chalk.green(filename));
          console.log(`All opreations finished (${chalk.green(new Date())})`);
        }
    })
})
