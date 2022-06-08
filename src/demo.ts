import 'regenerator-runtime/runtime';
import * as vega from "vega";;
import VegaTransformDB from "vega-transform-db";
import { specRewrite } from "vega-plus"
var htmldiff = require("../dependencies/htmldiff.js")
import { view2dot } from '../dependencies/view2dot'
var hpccWasm = window["@hpcc-js/wasm"];
import { DuckDB, SqliteDB } from "../src"
import {tableFromJson, flights_vegaplus_spec, flights_vega_spec, car_duckdb_spec, cars_spec} from "./main"
import {Chart, registerables, LinearScale, CategoryScale} from "chart.js"
import { BarWithErrorBarsController, BarWithErrorBar } from 'chartjs-chart-error-bars';


Chart.register(...registerables);
Chart.register(BarWithErrorBarsController, BarWithErrorBar, LinearScale, CategoryScale);




var ace = require('brace');
require('brace/mode/json');
require('brace/theme/github');

var duckdb_startup = 0;

var editor = ace.edit('editor');
editor.getSession().setMode('ace/mode/json');
editor.setTheme('ace/theme/github');
editor.setOption("wrap",true);
editor.setOption("scrollPastEnd", 1);
editor.setValue(JSON.stringify(cars_spec, null, 2));

var vseditor = ace.edit(document.querySelectorAll('pre[id=editor]')[0]);
vseditor.getSession().setMode('ace/mode/json');
vseditor.setTheme('ace/theme/github');


var vp_editor = ace.edit(document.querySelectorAll('p[id=editor]')[0]);
vp_editor.getSession().setMode('ace/mode/json');
vp_editor.setTheme('ace/theme/github');
vp_editor.setOption("wrap",true);
vp_editor.setOption("scrollPastEnd", 1);
vp_editor.setValue(JSON.stringify(car_duckdb_spec, null, 2));



var url_loc = window.location.origin.toString();
var db = DuckDBs()
// var SQL_db = sqliteDB()

// async function sqliteDB(){
//   var data_url = require("../data/sql.db")
//   data_url = url_loc + data_url
//   const db = new SqliteDB<"Test">(data_url)
//   await db.initialize();
//   return db
// }

async function DuckDBs(){
  var start = Date.now()
  var url = require("../data/flights-3m.parquet");
  url = url_loc + url
  const db = new DuckDB<"Test">(url, "flights");
  await db.initialize();
  var cars_url = require("../data/cars.parquet");
  await db.create_table(url_loc+cars_url, "cars")
  var end = Date.now()
  console.log("Database Startup Time", end-start)
  duckdb_startup = end-start;
  return db
}

function rename(dataSpec, type) {
    for (var i = 0; i < dataSpec.length; i++) {
      var spec = dataSpec[i]
      for (const transform of spec.transform) {
        if (transform.type === "dbtransform") transform.type = type
  
      }
    }
}

const ctx = document.getElementById('myChart') as HTMLCanvasElement;

const myChart = new Chart(ctx.getContext('2d'), {
    type: BarWithErrorBarsController.id,
    data: {
        labels: ['Vega', 'VegaPlus', 'VegaPlus + DB Start'],
        datasets: [{
            label: 'Runtime Latency (ms)',
            data: [
              {
                x: 4037,
                xMin: 4037*0.95,
                xMax: 4037*1.05,
              },
              {
                x: 542,
                xMin: 542*0.95,
                xMax: 542*1.05,
              },
              {
                x: 542+duckdb_startup,
                xMin: (542+duckdb_startup)*0.95,
                xMax: (542+duckdb_startup)*1.05,
              },
            ],
            backgroundColor: [
                'rgba(255, 99, 132, 0.2)',
                'rgba(54, 162, 235, 0.2)',
                'rgba(255, 206, 86, 0.2)',
                'rgba(75, 192, 192, 0.2)',
                'rgba(153, 102, 255, 0.2)',
                'rgba(255, 159, 64, 0.2)'
            ],
            borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(153, 102, 255, 1)',
                'rgba(255, 159, 64, 1)'
            ],
            borderWidth: 1
        }]
    },
    options: {
        indexAxis: 'y',
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true
            }
        }
    }
});

db.then(function(db){
    async function duck_db_query(query){
      const results = await db.queries(query);
      return results;
    }
    // SQL_db.then(function(SQL_db){
    //     async function sql_query(query){
    //       const results = await SQL_db.queries(query);
    //       return results;
    //     }
    
        (VegaTransformDB as any).type('Serverless');
        var vega_start, vega_end, vega_time, vp_start, vp_end, vega_plus_time;
        var view_vp: vega.View, view: vega.View;
        async function Run_Visualization(_, vp_spec){

            console.log(duckdb_startup, duckdb_startup*0.9, duckdb_startup*1.1)
            var vega_spec = JSON.parse(editor.getValue().toString().trim())
            console.log(vseditor.getValue())
            var table_name = JSON.parse(vseditor.getValue().toString().trim())["source"]

            {
                let vp_spec_copy = (JSON.parse(JSON.stringify(vp_spec)));
                (VegaTransformDB as any).QueryFunction(duck_db_query);
                const newspec_vp = specRewrite(vp_spec_copy)
                rename(newspec_vp.data, "dbtransform");
                (vega as any).transforms["dbtransform"] = VegaTransformDB;
                const runtime_vp = vega.parse(newspec_vp);
                vp_start = Date.now()
                view_vp = new vega.View(runtime_vp)
                .logLevel(vega.Info)
                .renderer("svg")
                .initialize(document.querySelector("#VegaDuckVisualization"));                    
                await view_vp.runAsync();
                vp_end = Date.now()
                vega_plus_time = vp_end-vp_start;
                console.log("VPT", vega_plus_time)
                myChart.data.datasets[0].data[1]['x'] = vega_plus_time
                myChart.data.datasets[0].data[2]['x'] = vega_plus_time+duckdb_startup
                myChart.data.datasets[0].data[1]['xMin'] = vega_plus_time*0.95
                myChart.data.datasets[0].data[2]['xMin'] = (vega_plus_time+duckdb_startup)*0.95
                myChart.data.datasets[0].data[1]['xMax'] = vega_plus_time*1.05
                myChart.data.datasets[0].data[2]['xMax'] = (vega_plus_time+duckdb_startup)*1.05
                console.log(myChart.data.datasets[0].data[1]['x'])
                view_vp.addDataListener(table_name, function(name, value) {
                    vp_end = Date.now()
                    vega_plus_time = vp_end-vp_start;
                    console.log("VPT-Signal", vega_plus_time)
                    myChart.data.datasets[0].data[1]['x'] = vega_plus_time
                    myChart.data.datasets[0].data[2]['x'] = vega_plus_time+duckdb_startup
                    myChart.data.datasets[0].data[1]['xMin'] = vega_plus_time*0.95
                    myChart.data.datasets[0].data[2]['xMin'] = (vega_plus_time+duckdb_startup)*0.95
                    myChart.data.datasets[0].data[1]['xMax'] = vega_plus_time*1.05
                    myChart.data.datasets[0].data[2]['xMax'] = (vega_plus_time+duckdb_startup)*1.05
                    myChart.update();
                    tableFromJson(value, 'showVegaDuckData');
                    });

                tableFromJson(view_vp["_runtime"]["data"][table_name]["values"]["value"], 'showVegaDuckData')

                var tmp = view_vp["_runtime"]["signals"]
                for (var val of Object.keys(tmp)) {
                    view_vp.addSignalListener(val, function(name, value) {
                        view.signal(name, value)
                        vp_start = Date.now()
                        tmp[name]['value'] = value
                        signal_viewer(tmp, "signalDuckData")
                        });    
                }
                signal_viewer(tmp, "signalDuckData")

                view_vp.runAfter(view => {
                    const dot = `${view2dot(view)}`
                    hpccWasm.graphviz.layout(dot, "svg", "dot").then(svg => {
                    const placeholder = document.getElementById("vegaplus-graph-placeholder");
                    placeholder.innerHTML = svg;
                    });
                })
           
                const newvegaspec = specRewrite(vega_spec);
                const vega_runtime = vega.parse(newvegaspec);
                vega_start = Date.now()
                view = new vega.View(vega_runtime)
                .logLevel(vega.Info)
                .renderer("svg")
                .initialize(document.querySelector("#VegaVisualization"));
                await view.runAsync();
                vega_end = Date.now()
                vega_time = vega_end-vega_start;
                console.log("VT", vega_time)
                myChart.data.datasets[0].data[0]['x'] = vega_time
                myChart.data.datasets[0].data[0]['xMin'] = (vega_time)*0.95
                myChart.data.datasets[0].data[0]['xMax'] = vega_time*1.05

                view.addDataListener(table_name, function(name, value) {
                    vega_end = Date.now()
                    vega_time = vega_end-vega_start;
                    console.log("VT-Signal", vega_time)
                    myChart.data.datasets[0].data[0]['x'] = vega_time
                    myChart.data.datasets[0].data[0]['xMin'] = (vega_time)*0.95
                    myChart.data.datasets[0].data[0]['xMax'] = vega_time*1.05    
                    myChart.update();
                    tableFromJson(value, 'showVegaData');
                });
                tableFromJson(view["_runtime"]["data"][table_name]["values"]["value"], 'showVegaData')

                var tmp1 = view["_runtime"]["signals"]
                for (var val of Object.keys(tmp1)) {
                    view.addSignalListener(val, function(name, value) {
                        vega_start = Date.now()
                        tmp1[name]['value'] = value
                        signal_viewer(tmp1, "signalVegaData")
                        });    
                }
                signal_viewer(tmp1, "signalVegaData")
                view.runAfter(view => {
                    const dot = `${view2dot(view)}`
                    hpccWasm.graphviz.layout(dot, "svg", "dot").then(svg => {
                    const placeholder = document.getElementById("vega-graph-placeholder");
                    placeholder.innerHTML = svg;
                    });
                })
            }

            myChart.update();


            // {
            //     let vp_spec_copy = (JSON.parse(JSON.stringify(vp_spec)));
            //     (VegaTransformDB as any).QueryFunction(sql_query);
            //     const newspec_vp = specRewrite(vp_spec_copy)
            //     rename(newspec_vp.data, "dbtransform");
            //     (vega as any).transforms["dbtransform"] = VegaTransformDB;
            //     const runtime_vp = vega.parse(newspec_vp);
            //     const view_vp_1 = new vega.View(runtime_vp)
            //     .logLevel(vega.Info)
            //     .renderer("svg")
            //     .initialize(document.querySelector("#VegaSQLVisualization"));
            //     view_vp_1.addDataListener(table_name, function(name, value) {
            //         tableFromJson(value, 'showVegaSQLData');
            //         });
                    
            //     await view_vp_1.runAsync();
            //     tableFromJson(view_vp_1["_runtime"]["data"][table_name]["values"]["value"], 'showVegaSQLData')

            //     var tmp = view_vp_1["_runtime"]["signals"]
            //     for (var val of Object.keys(tmp)) {
            //         view_vp_1.addSignalListener(val, function(name, value) {
            //             tmp[name]['value'] = value
            //             signal_viewer(tmp, "signalSQLData")
            //             });    
            //     }
            //     signal_viewer(tmp, "signalSQLData")

            // }

            
            
            
        }

        function signal_viewer(signal, id){
              var signal_data = []
              for (var val of Object.keys(signal)) {
                  if(signal[val]['value']){
                      if(typeof(signal[val]['value'])=='object'){
                          signal_data.push({"Signal": val, "Value": JSON.stringify(signal[val]['value'])})
                      }
                      else{
                          signal_data.push({"Signal": val, "Value": signal[val]['value'].toString()})
                      }
                  }
                  else{
                      signal_data.push({"Signal": val, "Value": "null"})
                  }
              }
              tableFromJson(signal_data, id)

        }

        function examples(_, spec:any, name:any){
            vseditor.setValue('{"source":"' + name + '"}')
            editor.setValue(JSON.stringify(spec, null, 2));
            if(name=="cars"){
                vp_editor.setValue(JSON.stringify(car_duckdb_spec, null, 2));
                Run_Visualization(null, car_duckdb_spec)
            }
            else{            
                vp_editor.setValue(JSON.stringify(flights_vegaplus_spec, null, 2));
                Run_Visualization(null, flights_vegaplus_spec)
            }
        }

        Run_Visualization(null, car_duckdb_spec)
        document.getElementById("bug").click()
        document.getElementById("bug1").click()
        document.getElementById('Cars').addEventListener('click', event => {examples(event, cars_spec, "cars")});
        document.getElementById('Flights').addEventListener('click', event => {examples(event, flights_vega_spec, "table")});
    // });

});