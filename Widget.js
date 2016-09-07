define(['dojo/_base/declare', 'dojo/_base/lang', 'jimu/BaseWidget', 'esri/request', "dojo/parser", "dijit/registry", "dojo/dom", "jimu/WidgetManager", "dojo/_base/array", "esri/layers/GraphicsLayer", "esri/symbols/SimpleFillSymbol", "esri/graphic", "esri/tasks/Geoprocessor", "esri/tasks/DataFile", "esri/graphicsUtils", "../../../libs/echarts"],
  function(declare, lang, BaseWidget, esriRequest, parser, registry, dom, WidgetManager, array, GraphicsLayer, SimpleFillSymbol, Graphic, Geoprocessor, DataFile, graphicsUtils, echarts) {
    //To create a widget, you need to derive from BaseWidget.
    return declare([BaseWidget], {

      // Custom widget code goes here

      baseClass: 'BaseWidget',
      // this property is set by the framework when widget is loaded.
      // name: 'DemoWidget',
      // add additional properties here
      gp: null,
      glayer: null,
      chart: null,

      //methods to communication with app container:
      postCreate: function() {
        this.inherited(arguments);
        console.log('DemoWidget::postCreate');

      },
      startup: function() {
        this.inherited(arguments);
        this.chart = echarts.init(this.myChart, 'macarons');
        this.gp = new Geoprocessor("https://www.seanpc.com/ags/rest/services/SummaryModel/GPServer/ClipModel");
        this.glayer = new GraphicsLayer();
        this.map.addLayer(this.glayer);
      },

      onOpen: function() {
        this.inherited(arguments);
        this.glayer.visible = 1;
      },

      onClose: function() {
        this.inherited(arguments);
        this.glayer.visible = 0;
      },

      uploadFile: function() {
        esriRequest({
          url: "https://www.seanpc.com/ags/rest/services/SummaryModel/GPServer/uploads/upload",
          content: {
            f: 'pjson',
            description: '',
          },
          form: this.uploadForm,
          handleAs: "json"
        }).then(lang.hitch(this, "onUpload"));
      },

      onUpload: function(result) {
        var itemID = result.item.itemID;
        var dataFile = new DataFile();
        dataFile.itemID = itemID;
        var params = {
          "zipFile": dataFile
        };
        this.gp.submitJob(params, lang.hitch(this, "onClip"));
      },

      onClip: function(jobInfo) {
        this.gp.getResultData(jobInfo.jobId, "OutShp", lang.hitch(this, "onShowResult"));
        this.gp.getResultData(jobInfo.jobId, "SummaryTable").then(lang.hitch(this, "onUpdateChart"));
      },

      onShowResult: function(r) {
        var symbol = new SimpleFillSymbol();
        array.forEach(r.value.features, function(fea) {
          this.glayer.add(new Graphic(fea.geometry, symbol));
        }, this);
        this.map.setExtent(graphicsUtils.graphicsExtent(r.value.features));
      },

      onUpdateChart: function(r) {
        var areaData = array.map(r.value.features, function(fea) {
          return fea.attributes["COUNT_Shape_Area"];
        }, this);
        var classData = array.map(r.value.features, function(fea) {
          return fea.attributes["landtype"];
        }, this);
        var chartData = [];
        for (var i = 0; i < classData.length; i++) {
          chartData.push({
            name: classData[i],
            value: areaData[i],
            label: {
              normal: {
                show: true
              }
            }
          });
        }
        var sortedChartData = chartData.sort(function(a, b) {
          if (a.value > b.value)
            return 1;
          else if (a.value < b.value)
            return -1;
          return 0;
        });
        var sortedData = areaData.sort(function(a, b) {
          if (a > b)
            return 1;
          else if (a < b)
            return -1;
          return 0;
        });
        var option = {
          title: {
            text: '土地类型统计图'
          },
          color: ['#3398DB'],
          grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
          },
          tooltip: {
            trigger: 'axis',
            axisPointer: {
              type: 'shadow'
            }
          },
          xAxis: [{
            type: 'value'
          }],
          yAxis: [{
            type: 'category',
            data: classData
          }],
          series: [{
            name: '面积',
            type: 'bar',
            barWidth: '60%',
            data: sortedChartData,
            label: {
              normal: {
                show: true,
                position: 'right',
                textStyle: {
                  fontSize: 10,
                  color: '#00A2E8'
                },
                formatter: '{c}'
              }
            }
          }]
        };
        this.chart.setOption(option);
      }

    });

  });