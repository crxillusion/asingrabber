Array.prototype.unique = function () {
    return this.filter(function (value, index, self) {
        return self.indexOf(value) === index;
    });
};

function downloadCSV(stockData, count) {
    var data, filename, link;
    var csv = stockData;
    if (csv == null) return;
    if (count !== csv.length && !isNaN(count)) {
        csv = csv.slice(0, count);
    }
    filename = 'asins.csv';
    csv = csv.join(',\n');
    if (!csv.match(/^data:text\/csv/i)) {
        csv = 'data:text/csv;charset=utf-8,' + csv;
    }
    data = encodeURI(csv);

    link = document.createElement('a');
    link.setAttribute('href', data);
    link.setAttribute('download', filename);
    link.click();
}

$(document).ready(function () {

    chrome.tabs.executeScript(null, {
        file: "getDomString.js"
    }, function () {
        if (chrome.extension.lastError) {
            Materialize.toast('There was an error processing a page : \n' + chrome.extension.lastError.message, 5000, 'red rounded');
        }
    });

    /*document.getElementById('copy_asins').addEventListener('click', function (event) {
        var copyTextarea = document.querySelector('#asins');
        copyTextarea.select();

        try {
            if (document.execCommand('copy')) {
                Materialize.toast("Copied!", 2000)
            }
        } catch (err) {
            Materialize.toast("Something went wrong.", 2000)
        }
    });*/

    document.getElementById('download_asins').addEventListener('click', function (event) {
        if ($('#asins').text().length === 0) {
            Materialize.toast("No data to download!", 2000);
        } else {
            var count = parseInt($('#max_value').val()), data = $('#asins').text().split(',');
            if (count <= 0 || count > data.length) {
                Materialize.toast("Please enter valid number!", 2000);
            } else {
                downloadCSV(data, count);
            }
        }
    });


});

function scanAsins(container) {
    $.each($(container).find('li[id^="result_"]'), function (key, value) {
        if (typeof $(value).attr('data-asin') !== "undefined") {
            asins.push($(value).attr('data-asin'));
        }
    });
}


chrome.extension.onMessage.addListener(function (request, sender) {
    if (request.action == "getDOM") {
        var dom = request.source, parser = new DOMParser()
            , doc = parser.parseFromString(dom, "text/html");
        if (dom == undefined) {
            asin_container.innerText = "DOM has not been parsed!";
        } else {
            asins = [];
            //scanning current page
            scanAsins(doc);
            //checking if there is a pagination
            if ((pagn = $(doc).find('#pagn')).length > 0) {
                pages = $(pagn).find('.pagnLink').length + 1;// plus current page
                pageLink = $(pagn).find('.pagnLink').last().find('a').attr('href');
                currPage = $(pagn).find('.pagnCur').text();
                if ($(pagn).find('#pagnNextLink').length === 0) { //last page
                    pages = currPage;
                } else { // not the last page
                    if ($(pagn).find('.pagnDisabled').length > 0) {
                        pages = $(pagn).find('.pagnDisabled').text();
                    } else {
                        pages = $(pagn).find('.pagnLink').last().find('a').text();
                    }
                }
                var deferreds = [], pagesArray = [];
                for (var i = 1; i <= pages; i++) {
                    if (i != currPage) {
                        pagesArray.push(i);
                    }
                }
                $.each(pagesArray, function (index, page) {
                    newlink = pageLink.replace(/page=\d+/i, 'page=' + page);
                    url = 'https://amazon.com' + newlink.replace(/sr_pg_\d+/i, 'sr_pg_' + page);
                    deferreds.push(
                        $.ajax({
                            url: url,
                            type: 'GET',
                            success: function (data) {
                                if (data.length > 0) {
                                    scanAsins(parser.parseFromString(data, "text/html"));
                                }
                            }
                        })
                    );
                });
                // Can't pass a literal array, so use apply.
                $.when.apply($, deferreds).then(function () {
                    $('#asins').text(asins.unique().join(','));
                    $('#asins_count').val(asins.unique().length);
                }).fail(function () {
                    console.log('fail');
                });
                /*for (var i = 1; i <= pages; i++) {
                    if (i != currPage) {
                        url = 'https://amazon.com' + pageLink.replace(/page=\d+/i, 'page=' + i);
                        $.ajax({
                            type: "GET",
                            url: url,
                            success: function (data) {
                                if (data.length > 0) {
                                    scanAsins(parser.parseFromString(data, "text/html"));
                                }
                            }
                        });
                    }
                }*/
            } else {
                $('#asins').text(asins.unique().join(','));
                $('#asins_count').val(asins.unique().length);
            }
        }

    }
});