/* ===================================================
 * bootstrap-transition.js v2.1.1
 * http://twitter.github.com/bootstrap/javascript.html#transitions
 * ===================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */

var map;
var sqlapi;
var chart;

function addBarChart(containerName, data){
chart = new Highcharts.Chart({
            chart: {
                renderTo: containerName,
                type: 'spline'
            },
            title: false,
            subtitle: false,
            exporting: { enabled: false },
            showLegend: false,
            xAxis: {
                type: 'datetime',
                dateTimeLabelFormats: { // don't display the dummy year
                    month: '%e. %b',
                    year: '%b'
                }
            },
            yAxis: {
                title: false,
                min: 0
            },
            tooltip: {
                formatter: function() {
                        return '<b>'+ this.series.name +'</b><br/>'+
                        Highcharts.dateFormat('%e. %b', this.x) +': '+ this.y +' m';
                }
            },
            
            series: [{
                name: 'Winter 2007-2008',
                showInLegend: false,
                // Define the data points. All series have a dummy year
                // of 1970/71 in order to be compared on the same x axis. Note
                // that in JavaScript, months start at 0 for January, 1 for February etc.
                data: data
                // [
                //     [Date.UTC(1970,  9, 27), 0   ],
                //     [Date.UTC(1970, 10, 10), 0.6 ],
                //     [Date.UTC(1970, 10, 18), 0.7 ],
                //     [Date.UTC(1970, 11,  2), 0.8 ],
                //     [Date.UTC(1970, 11,  9), 0.6 ],
                //     [Date.UTC(1970, 11, 16), 0.6 ],
                //     [Date.UTC(1970, 11, 28), 0.67],
                //     [Date.UTC(1971,  0,  1), 0.81],
                //     [Date.UTC(1971,  0,  8), 0.78],
                //     [Date.UTC(1971,  0, 12), 0.98],
                //     [Date.UTC(1971,  0, 27), 1.84],
                //     [Date.UTC(1971,  1, 10), 1.80],
                //     [Date.UTC(1971,  1, 18), 1.80],
                //     [Date.UTC(1971,  1, 24), 1.92],
                //     [Date.UTC(1971,  2,  4), 2.49],
                //     [Date.UTC(1971,  2, 11), 2.79],
                //     [Date.UTC(1971,  2, 15), 2.73],
                //     [Date.UTC(1971,  2, 25), 2.61],
                //     [Date.UTC(1971,  3,  2), 2.76],
                //     [Date.UTC(1971,  3,  6), 2.82],
                //     [Date.UTC(1971,  3, 13), 2.8 ],
                //     [Date.UTC(1971,  4,  3), 2.1 ],
                //     [Date.UTC(1971,  4, 26), 1.1 ],
                //     [Date.UTC(1971,  5,  9), 0.25],
                //     [Date.UTC(1971,  5, 12), 0   ]
                // ]
            }]
        });
}

function addMap(){
    map = L.map('map_main', { 
      zoomControl: false,
      center: [11, 11],
      zoom: 7
    })

    // add a nice baselayer from mapbox
    L.tileLayer('http://tile.stamen.com/toner/{z}/{x}/{y}.jpg', {
      attribution: 'Stamen'
    }).addTo(map);


    //add our main layer
    cartodb.createLayer(map, 'http://sanhack.cartodb.com/api/v1/viz/13360/viz.json', {
      query:  'SELECT  \
               cartodb_id,'+ Math.random() +' as breaker, \
               the_geom_webmercator,\
               the_geom,\
               phone,\
               class_size,\
               (SELECT count(*) FROM daily_class_count WHERE phone = pr.phone) as bubble_size \
              FROM phone_registration pr',
      tile_style: '#{{table_name}}{\
                marker-fill: #FF5C00;\
                marker-opacity: 0.8;\
                marker-allow-overlap: true;\
                marker-placement: point;\
                marker-type: ellipse;\
                marker-width: 35;\
                marker-line-width: 1;\
                marker-line-color: #FFF;\
                marker-line-opacity: 1;\
                [bubble_size <= 15]{marker-width: 30;}\
                [bubble_size <= 11]{marker-width: 25;}\
                [bubble_size <= 8]{marker-width: 20;}\
                [bubble_size <= 3]{marker-width: 15;}\
                [bubble_size <= 1]{marker-width: 10;}\
              }',
      interactivity: false
    })
     .on('done', function(layer) {
      map.addLayer(layer);

      layer.on('featureOver', function(e, pos, latlng, data) {
        cartodb.log.log(e, pos, latlng, data);
      });

      layer.on('error', function(err) {
        cartodb.log.log('error: ' + err);
      });

    }).on('error', function() {
      cartodb.log.log("some error occurred");
    });

    console.log(cartodb)
}

!function ($) {


  $(function () {

    addMap();
    var st = $('#overview-list').first();
    sqlapi = new cartodb.SQL({ user: 'sanhack' });
    sqlapi.execute("SELECT school, phone, class_size, females, (SELECT array_agg(attendance_f ORDER BY created_at) FROM daily_class_count WHERE phone = pr.phone) as attendance_f, (SELECT array_agg((created_at::date)::text ORDER BY created_at) FROM daily_class_count WHERE phone = pr.phone) as created_at FROM phone_registration pr ORDER BY (SELECT count(*) FROM daily_class_count WHERE phone = pr.phone) DESC")
      .done(function(data) {
        console.log(data)
        for (var i = 0; i < data.rows.length; i++){
          var d2 = $('<div>').attr('class','span12'),
              p = $('<span>').attr('class','span3'),
              c = $('<span>').attr('class','span7 chart');
          var cid = 'bar-chart-'+i;
          c.attr('id', cid);
          p.append("<span class='school-block'>" + data.rows[i].school + "</span>");
          p.append("<span class='phone-block'>" + data.rows[i].phone + "</span>");
          d2.append(p);
          d2.append(c);
          var d = $('<div>').attr('class','row bar-row');
          d.append(d2);
          st.append(d);
          if (data.rows[i].attendance_f != null){
            var k = [];
            for (var j = 0; j < data.rows[i].attendance_f.length; j++){
              var jj = data.rows[i].created_at[j].split('-');
              var dd = Date.UTC(jj[0],  jj[1], jj[2]);
              k.push([dd, data.rows[i].attendance_f[j]])
            }
            addBarChart(cid, k );
          }
          console.log(data.rows[i])
        }
        console.log(data.rows);
      })
      .error(function(errors) {
        // errors contains a list of errors
        console.log("error:" + err);
      })



  });

}(window.jQuery);