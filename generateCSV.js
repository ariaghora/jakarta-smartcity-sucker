const fs = require('fs')
const jsonfile = require('jsonfile')
const async = require('async')
const readline = require('readline-sync');
const json2csv = require('json2csv')
const _ = require('lodash')

filename = process.argv[2]
var data = []
var filteredData = []

if (filename === undefined) {
    console.log('filename required')
} else {
    var readJSON = function(cb) {
        jsonfile.readFile(filename, function(err, obj) {
            if (err) {
                console.log('error reading file: ' + err)
            }
            data = obj
            cb()
        })
    }

    var filterData = function(cb) {
        // flatten data
        flattenData = []
        // filteredData = data.filter(x=>x.type === 'Sanitation').forEach(function(x) {
        filteredData = data.forEach(function(x) {
            var o = {}
            o.case_id = x.id
            o.category = x.type
            o.resource = 'QLUE'
            o.username = x.profile.username
            o.timestamp = new Date(x.profile.timestamp)
            o.kode_kelurahan = x.profile.detail.kd_kel
            o.nama_kelurahan = x.profile.detail.name_kel
            o.lat = x.profile.location.lat
            o.long = x.profile.location.lng
            o.status = 'initiated'
            o.description = x.profile.detail.desc
            o.tags = x.profile.detail.suggest.tags.toString().trim()
            o.comments = x.profile.detail.comment_count
            o.photo_video = x.profile.detail.image
            flattenData.push(o)

            // append follow_up action
            x.follow_up.forEach(function(xFollowUp) {
                oFollowUp = {}
                oFollowUp.case_id = o.case_id
                oFollowUp.category = o.category
                oFollowUp.resource = xFollowUp.tl_by
                oFollowUp.username = xFollowUp.username
                oFollowUp.timestamp = new Date(xFollowUp.timestamp)
                oFollowUp.kode_kelurahan = o.kode_kelurahan
                oFollowUp.nama_kelurahan = o.nama_kelurahan
                oFollowUp.lat = o.lat
                oFollowUp.long = o.long
                oFollowUp.status = xFollowUp.status
                oFollowUp.description = xFollowUp.description
                oFollowUp.tags = o.tags
                oFollowUp.comments = o.comments
                oFollowUp.photo_video = xFollowUp.file
                flattenData.push(oFollowUp)
            })
        })

        // sort by initiation time
        flattenData = _.sortBy(flattenData, ['case_id', 'timestamp'])

        // convert to csv and store to file
        var csv = json2csv({data:flattenData})
        fs.writeFile('data/latest.csv', csv, function(err) {
            if (err) {
                throw err
            }

            // remove unnecessary first line (which is the CSV header) for easier appending
            var n = csv.split('\n')
            n.shift()
            var newCsv = n.join('\n')

            console.log('CSV file saved to "data/latest.csv"')

            var answer = readline.question('Want to append to main dataset? (y/n) ')
            if (answer.toUpperCase() === 'Y') {
                fs.appendFile('data/data_all.csv', '\n'+newCsv, function(err) {
                    if (err) {
                        throw err
                    }
                    console.log('Operation finished');
                })
            }
        })
        cb()
    }

    async.series([readJSON, filterData])
}
