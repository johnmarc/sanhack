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
                    month: '%b %e',
                    year: '%b'
                }
            },
            yAxis: {
                title: false,
                min: 0
            },
            tooltip: {
                formatter: function() {
                        return '<b>'+Highcharts.dateFormat('%b %e', this.x) +'</b><br/>'+
                        this.y +' girls';
                }
            },
            
            series: [{
                name: 'Attendance rate',
                showInLegend: false,
                // Define the data points. All series have a dummy year
                // of 1970/71 in order to be compared on the same x axis. Note
                // that in JavaScript, months start at 0 for January, 1 for February etc.
                data: data
            }]
        });
}
var selected = null;
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
               phone,school,\
               class_size,\
               (SELECT count(*) FROM daily_class_count WHERE phone = pr.phone) as bubble_size \
              FROM phone_registration pr',
      tile_style: "#{{table_name}}{\
                text-name: '[school]';\
                text-face-name: 'DejaVu Sans Book';\
                text-vertical-alignment: top;\
                text-dy: -15;\
                text-halo-fill: #959ea4;\
                text-halo-radius: 1;\
                text-size: 15;\
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
              }",
      //interactivity: false
    })
     .on('done', function(layer) {
      map.addLayer(layer);

      layer.on('featureClick', function(e, pos, latlng, data) {
        $(".bar-row").each(function(){
            $(this).removeClass('selected');
            selected = data.cartodb_id;
          if ($(this).attr('id') == data.cartodb_id){
            $(this).prependTo(this.parentNode);
            $(this).addClass('selected');
          }
        })
      });

      layer.on('error', function(err) {
        cartodb.log.log('error: ' + err);
      });

    }).on('error', function() {
      cartodb.log.log("some error occurred");
    });
}


function runSQL(){

    var st = $('#overview-list').first();
    sqlapi = new cartodb.SQL({ user: 'sanhack' });
    sqlapi.execute("SELECT cartodb_id,school, phone, class_size, females, (SELECT array_agg(attendance_f ORDER BY created_at) FROM daily_class_count WHERE phone = pr.phone) as attendance_f, (SELECT array_agg((created_at::date)::text ORDER BY created_at) FROM daily_class_count WHERE phone = pr.phone) as created_at FROM phone_registration pr ORDER BY (SELECT count(*) FROM daily_class_count WHERE phone = pr.phone) DESC")
      .done(function(data) {
        st.empty();
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
          d.attr('id',data.rows[i].cartodb_id)
          d.append(d2);
          if (selected == null){
            st.append(d);
          } else {
            if (selected == data.rows[i].cartodb_id) {
              d.addClass('selected')
              st.prepend(d);
            } else {
              st.append(d);
            }
          }
          if (data.rows[i].attendance_f != null){
            var k = [];
            for (var j = 0; j < data.rows[i].attendance_f.length; j++){
              var jj = data.rows[i].created_at[j].split('-');
              var dd = Date.UTC(jj[0],  jj[1]-1, jj[2]);
              k.push([dd, data.rows[i].attendance_f[j]])
            }
            console.log(cid, k)
            addBarChart(cid, k );
          }
        }
      })
      .error(function(errors) {
        // errors contains a list of errors
        console.log("error:" + err);
      })

}

var latest = null;
function getLatest(){
    var latestSql = new cartodb.SQL({ user: 'sanhack' });
    latestSql.execute("SELECT max(extract(epoch FROM updated_at)) as max FROM daily_class_count")
    .done(function(data) {
      latest = data.rows[0].max + 1; //dunno why i needed to add 1 second
    });
}
function doPoll(){
  
  if (latest == null){ 
    runSQL();
    getLatest();
          setTimeout(doPoll,5000);
  } else {
    var updateSql = new cartodb.SQL({ user: 'sanhack' });
      updateSql.execute("SELECT count(*) as ct FROM daily_class_count WHERE extract(epoch FROM updated_at) > "+latest+" ")
        .done(function(data) {
          if (data.rows[0].ct > 0){
            runSQL();
            getLatest();
          }
          setTimeout(doPoll,5000);
        });
  }
   
}

var active = 'report-tab';
!function ($) {


  $(function () {

    $('#report-tab-content').show();
    $('ul.nav li').click(function(){
      if ($(this).attr('id') != active){
        active = $(this).attr('id') ;
        $('ul.nav li').removeClass('active');
        $(this).addClass('active');
        $('.tab').hide();
        $('#'+active+'-content').show();
      }
    })

    addMap();
    doPoll();
  });

}(window.jQuery);