import type { OptimizationInput } from '../../src/engine/models.js';

export const engineInput:OptimizationInput={mode:'bicycle',accountKind:'personal',origin:{kind:'manual-pin',coordinates:{latitude:30.0444,longitude:31.2357}},endpoint:{kind:'last-customer'},tasks:[{taskId:'customer-a',coordinates:{latitude:30.05,longitude:31.24}},{taskId:'customer-b',coordinates:{latitude:30.06,longitude:31.25}}]};
// Hand-authored provider fixtures: travel 30s/300m, two 600s visits => finish 1230s.
// Deliberately visit ID 2 before ID 1 to catch accidental array-position mapping.
export const optimizationFixture={
  code:0, summary:{routes:1,unassigned:0,setup:0,service:1200,duration:30,waiting_time:0,distance:300,violations:[]},unassigned:[],
  routes:[{vehicle:1,setup:0,service:1200,duration:30,waiting_time:0,distance:300,violations:[],steps:[
    {type:'start',location:[31.2357,30.0444],arrival:0,duration:0,distance:0,setup:0,service:0,waiting_time:0,violations:[]},
    {type:'job',id:2,location:[31.25,30.06],arrival:10,duration:10,distance:100,setup:0,service:600,waiting_time:0,violations:[]},
    {type:'job',id:1,location:[31.24,30.05],arrival:630,duration:30,distance:300,setup:0,service:600,waiting_time:0,violations:[]},
    {type:'end',location:[31.24,30.05],arrival:1230,duration:30,distance:300,setup:0,service:0,waiting_time:0,violations:[]}
  ]}]
};
export const routeFixture={code:'Ok',waypoints:[{location:[31.2357,30.0444]},{location:[31.24,30.05]}],routes:[{duration:12.5,distance:345.6,legs:[{duration:12.5,distance:345.6}],geometry:{type:'LineString',coordinates:[[31.2357,30.0444],[31.237,30.047],[31.24,30.05]]}}]};
export const tableFixture={code:'Ok',sources:[{location:[31.2357,30.0444]},{location:[31.24,30.05]}],destinations:[{location:[31.2357,30.0444]},{location:[31.24,30.05]}],durations:[[0,12.5],[15,0]],distances:[[0,345.6],[400,0]]};
