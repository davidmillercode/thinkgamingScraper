var express = require('express');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var app     = express();
var EventEmitter = require("events").EventEmitter;


app.get('/scrape', function(req, res){
    var ee = new EventEmitter();
    //when allData event is received, write file and update user
    ee.on('dataCollected', function(){
        //set day and time into user friendly format
        function getDate(){
            var today = new Date();
            var dd = today.getDate();
            var mm = today.getMonth()+1; //January is 0!

            var yyyy = today.getFullYear();
            var hour = today.getHours();
            var mins = today.getMinutes();
            if(dd<10){
                dd='0'+dd
            }
            if(mm<10){
                mm='0'+mm
            }
            return mm + '.' + dd+'.'+yyyy + '-at-' + hour + '.' + mins;
        }

        function totalRev(games){
            var total = {
                title: 'Total',
                revenue: 0,
                date: getDate()
            };
            games.forEach(function(game){
                var revToAdd = removeCommas(game.grossing.substring(1));
                total.revenue += +revToAdd; //removes $ sign and makes string into a number
            });
            games.unshift(total);

            return games;
        }
        function removeCommas(str){
            return str.replace(/,/g, '');
        }
        //get total revenues from Zynga and King and insert the object into the games array as the first item
        totalRev(games);
        totalRev(kGames);

        //write file on games / rev to file named after date
        fs.writeFile('znga.' + games[0].date + '.json', JSON.stringify(games, null, 4), function(err){
            console.log('Zynga file successfully written!');
        });
        fs.writeFile('king.' + kGames[0].date + '.json', JSON.stringify(kGames, null, 4), function(err){
            console.log('King file successfully written!');
        });

        res.send('Crawled');
    });

    //list of zynga and king games
    var zyngaGames = ['Wizard of Oz Slots Free Casino', 'Hit it Rich! Free Casino Slots', 'Zynga Poker - Texas Holdem',
    'Empires & Allies', 'CSR Racing', 'FarmVille 2: Country Escape', 'Zynga Poker Classic - Texas Holdem',
    'CastleVille Legends', 'Words On Tour', 'Words With Friends', 'Zynga Poker - Texas Holdem HD'];
    var kingGames = ['AlphaBetty Saga', 'Bubble Witch 2 Saga', 'Bubble Witch Saga', 'Candy Crush Saga',
    'Candy Crush Soda Saga', 'Diamond Digger Saga', 'Farm Heroes Saga', 'King Challenge', 'Papa Pear Saga',
    'Paradise Bay', 'Pet Rescue Saga', 'Pyramid Solitaire Saga'];

    //urls that will be crawled on thinkgaming
    var thinkgamingUrls = ['https://thinkgaming.com/app-sales-data/', 'https://thinkgaming.com/app-sales-data/?page=2',
        'https://thinkgaming.com/app-sales-data/?page=3', 'https://thinkgaming.com/app-sales-data/?page=4'];
    var games = []; //this will contain all the data about all the games
    var kGames = []; //this will contain all data about king games
    var counter = 0; //number of urls that we've crawled

    // for each url, crawl the page and add any zynga or king games to their respective array
    // on the last crawled game, emit event that tells file writing function to go
    thinkgamingUrls.forEach(function(url){
        request(url, function(error, response, html){
            if(!error){
                //cheerio library gives jQuery functionality (almost)
                var $ = cheerio.load(html);

                // this is a collection of all the data on each page
                // data is placed in columns
                $('#gamesTable').filter(function(){
                    var $dataTable = $(this);

                    //find name of current row
                    var $tableNames = $dataTable.find('td.name');
                    var numGamesOnPage = $tableNames.length;
                    var numGamesOnPageCounted = 0; //counter
                    $tableNames.each(function() {
                        var $selected = $(this);
                        numGamesOnPageCounted += 1; //add to counter

                        //if the game is made by zynga
                        if (zyngaGames.indexOf($selected.text()) !== -1) {

                            var game = { title : "", grossing: 0, grossingRank: 0, downloadRank: 0};

                            game.title = $selected.text().trim();
                            //get grossing and trim out whitespace and newlines
                            game.grossing = $selected.next().next().text().trim(); //only the first in the set
                            var $downloads = $selected.prev().prev();
                            game.downloadRank = $downloads.text().trim();
                            game.grossingRank = $downloads.prev().text().trim();

                            games.push(game); //add obj to collection of games

                        }
                        //if game is made by king add it to kGames
                        if (kingGames.indexOf($selected.text()) !== -1) {

                            var kgame = { title : "", grossing: 0, grossingRank: 0, downloadRank: 0};

                            kgame.title = $selected.text().trim();
                            //get grossing and trim out whitespace and newlines
                            kgame.grossing = $selected.next().next().text().trim(); //only the first in the set
                            var $kdownloads = $selected.prev().prev();
                            kgame.downloadRank = $kdownloads.text().trim();
                            kgame.grossingRank = $kdownloads.prev().text().trim();

                            kGames.push(kgame); //add obj to collection of games

                        }
                        //when current page has been completely crawled, increase counter to let program know
                        if (numGamesOnPage === numGamesOnPageCounted){
                            counter += 1;
                        }
                        //if this was the last game found on the last webpage crawled tell scraper to write new file
                        if (numGamesOnPage === numGamesOnPageCounted && counter === thinkgamingUrls.length){
                            ee.emit('dataCollected');
                        }
                    });
                });
            }
        });
    });





});

app.listen('8081');

console.log('Magic happens on port 8081');

exports = module.exports = app;