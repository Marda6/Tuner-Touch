// ENCY Tuner Touch — the demo projects open in Tuner (the header tabs).
// Programs are written for the demo after the spec's pictures (Pipe bound: Mori Seiki NL 2500 with
// Sinumerik 840D, two channels — main and sub spindle) and the projects of the spec's Open screen.
// Per channel: the NC text, its operations (each starts at the line `at`), the errors a simulation
// WILL find (`errors` — the truth; the screen shows only those already simulated), how far it is
// simulated (`simTo`) and where the machine stands (`cur`).
window.TT_DEMO = [
  {name:'Pipe bound', file:'Pipe bound.snct', machine:'Mori Seiki NL 2500', control:'Sinumerik 840D', state:'paused', dirty:false,
    channels:[
      {file:'PipeBound_ch1.mpf', simTo:'N3315 Z-159.787', cur:'N3315 Z-159.787',
        ops:[
          {name:'OD grooving',     tool:'T6 · La4 Re0.2',      c:'--op-blue',   at:';OD grooving'},
          {name:'OD finishing',    tool:'T10 · CNMG-12',       c:'--op-green',  at:';OD finishing'},
          {name:'ID roughing',     tool:'T4 · Custom',         c:'--op-coral',  at:';ID roughing'},
          {name:'Hole chamfer 5D', tool:'T7 · Drill L50, D10', c:'--op-violet', at:';Hole chamfer 5D'},
          {name:'2D contouring',   tool:'T1 · Cylindrical',    c:'--op-yellow', at:';2D contouring'},
          {name:'ID grooving',     tool:'T8 · Custom',         c:'--op-blue',   at:';ID grooving'}],
        errors:[{at:'N3240 X48', type:'gouge'}, {at:'N3315 Z-159.787', type:'holder'}, {at:'N3440 G1 X46 F0.08', type:'plunge'}],
        text:[
          ';PIPE BOUND - CHANNEL 1', ';MORI SEIKI NL 2500 / SINUMERIK 840D', 'N10 G18 G90 G40 G95', 'N20 G54', 'N30 G0 X400 Z300',
          ';OD grooving', 'N3000 T6 D1', 'N3005 G96 S160 M4', 'N3010 G0 X154 Z-42', 'N3015 G1 X132 F0.08', 'N3020 G0 X154', 'N3025 Z-46',
          'N3030 G1 X132 F0.08', 'N3035 G0 X154', 'N3040 Z-50.2', 'N3045 G1 X132.4 F0.08', 'N3050 G0 X160 Z5', 'N3055 M5',
          ';OD finishing', 'N3060 T10 D1', 'N3065 G96 S220 M4', 'N3070 G0 X120 Z2', 'N3075 G1 Z0 F0.15', 'N3080 X138 CHR=1', 'N3085 Z-40',
          'N3090 G2 X148 Z-45 CR=5', 'N3095 G1 Z-90', 'N3100 X156', 'N3105 G0 X200 Z50', 'N3110 M5',
          ';ID roughing', 'N3200 T4 D1', 'N3205 G96 S180 M4', 'N3210 G0 X38 Z5', 'N3215 G1 Z-62 F0.25', 'N3220 X42', 'N3225 G0 Z5',
          'N3230 X44', 'N3235 G1 Z-62 F0.25', 'N3240 X48', 'N3245 G0 Z5', 'N3250 X50', 'N3255 G1 Z-48 F0.25', 'N3260 G0 X40 Z10', 'N3265 M5',
          ';Hole chamfer 5D', 'N3290 T7', 'N3295 G97 S3=10600 M3=3', 'N3300 G0 SPOS[1]=IC(-240)', 'N3305 Z10', 'N3310 X148',
          'N3315 Z-159.787', 'N3320 SPOS[1]=210', 'N3325 X112.04', 'N3330 X94.04', 'N3335 G1 X89.984 M8 F200', 'N3340 G0 X112.04',
          'N3345 Z-120.5', 'N3350 X96.2', 'N3355 G1 X92.1 F150', 'N3360 G0 X148', 'N3365 Z10 M9',
          ';2D contouring', 'N3370 T1 D1', 'N3375 G96 S220 M4', 'N3380 G0 X152 Z2', 'N3385 G1 X140 F0.2', 'N3390 Z-40',
          'N3395 G2 X150 Z-45 CR=5', 'N3400 G1 X160', 'N3405 G0 X200 Z50', 'N3410 M5',
          ';ID grooving', 'N3420 T8 D1', 'N3425 G96 S120 M4', 'N3430 G0 X40 Z5', 'N3435 Z-30', 'N3440 G1 X46 F0.08', 'N3445 G0 X40',
          'N3450 Z-34', 'N3455 G1 X46 F0.08', 'N3460 G0 X40', 'N3465 Z5 M9', 'N3470 G0 X400 Z300', 'N3475 M30']},
      {file:'PipeBound_ch2.mpf', simTo:'N130 G0 Z50', cur:'N130 G0 Z50',
        ops:[
          {name:'Part transfer', tool:'Sub spindle',    c:'--op-green',  at:';Part transfer'},
          {name:'Back facing',   tool:'T12 · DCMT-11',  c:'--op-yellow', at:';Back facing'},
          {name:'Back chamfer',  tool:'T12 · DCMT-11',  c:'--op-coral',  at:';Back chamfer'}],
        errors:[],
        text:[
          ';PIPE BOUND - CHANNEL 2 (SUB SPINDLE)', 'N10 G18 G90 G95', 'N20 G55',
          ';Part transfer', 'N100 M200', 'N105 G0 Z-160', 'N110 G1 Z-172 F500', 'N115 M211', 'N120 G4 F1', 'N125 M212', 'N130 G0 Z50',
          ';Back facing', 'N200 T12 D1', 'N205 G96 S200 M4', 'N210 G0 X150 Z2', 'N215 G1 Z0 F0.12', 'N220 X40', 'N225 G0 Z2', 'N230 X152',
          'N235 G0 X200 Z50',
          ';Back chamfer', 'N300 T12 D1', 'N305 G0 X136 Z2', 'N310 G1 Z0 F0.1', 'N315 X142 Z-3', 'N320 G0 X200 Z50', 'N325 M30']}
    ]},
  {name:'Shaft flange', file:'Shaft flange.snct', machine:'Okuma LB3000 EX II', control:'OSP-P300L', state:'calculating', pct:45, back:'needs', dirty:false,
    channels:[
      {file:'SHAFT_FL.MIN', simTo:null, cur:null,
        ops:[
          {name:'Face and OD rough', tool:'T1 · CNMG-12',  c:'--op-blue',   at:'(FACE AND OD ROUGH)'},
          {name:'OD finish',         tool:'T3 · VNMG-16',  c:'--op-green',  at:'(OD FINISH)'},
          {name:'Drill 4× D12',      tool:'T5 · Drill D12', c:'--op-violet', at:'(DRILL 4X D12)'},
          {name:'Part off',          tool:'T7 · Cut-off 3', c:'--op-coral',  at:'(PART OFF)'}],
        errors:[],
        text:[
          '(SHAFT FLANGE)', '(OKUMA LB3000 EX II / OSP-P300L)', 'G50 S2500',
          '(FACE AND OD ROUGH)', 'N100 G0 X400 Z300', 'N110 T0101', 'N120 G96 S180 M3', 'N130 G0 X130 Z2', 'N140 G1 Z0 F0.2', 'N150 X-1.6',
          'N160 G0 X126 Z2', 'N170 G1 Z-60 F0.3', 'N180 X128', 'N190 G0 Z2', 'N200 X122', 'N210 G1 Z-35 F0.3', 'N220 X126', 'N230 G0 X400 Z300',
          '(OD FINISH)', 'N300 T0303', 'N310 G96 S240 M3', 'N320 G0 X118 Z2', 'N330 G1 Z0 F0.12', 'N340 X120 Z-1', 'N350 Z-35',
          'N360 G2 X126 Z-38 R3', 'N370 G1 Z-60', 'N380 X132', 'N390 G0 X400 Z300',
          '(DRILL 4X D12)', 'N400 T0505', 'N410 M110', 'N420 G97 SB=1200 M13', 'N430 G0 X90 Z5 C0', 'N440 G1 Z-20 F0.15', 'N450 G0 Z5',
          'N460 C90', 'N470 G1 Z-20', 'N480 G0 Z5', 'N490 C180', 'N500 G1 Z-20', 'N510 G0 Z5', 'N520 C270', 'N530 G1 Z-20', 'N540 G0 Z5 M15',
          'N550 M109',
          '(PART OFF)', 'N600 T0707', 'N610 G96 S120 M3', 'N620 G0 X134 Z-62', 'N630 G1 X-1 F0.06', 'N640 G0 X400 Z300', 'N650 M2']}
    ]},
  {name:'Housing 5-axis', file:'Housing 5-axis.stcp', machine:'Matsuura MX-330', control:'Fanuc 31i-B5', state:'calculated', dirty:true, cam:true,
    channels:[
      {file:'O2041.NC', simTo:null, cur:null,
        ops:[
          {name:'Face mill',        tool:'T1 · Face mill D50', c:'--op-blue',   at:'(FACE MILL D50)'},
          {name:'Pocket rough',     tool:'T2 · End mill D12',  c:'--op-green',  at:'(POCKET ROUGH D12)'},
          {name:'5-axis chamfer',   tool:'T3 · Chamfer D6',    c:'--op-violet', at:'(5-AXIS CHAMFER D6)'},
          {name:'Drill 4× D8.5',    tool:'T4 · Drill D8.5',    c:'--op-yellow', at:'(DRILL 4X D8.5)'}],
        errors:[{at:'N460 G3 X-14 Y-24 R10', type:'machine'}],
        text:[
          '%', 'O2041 (HOUSING 5-AXIS)', '(MATSUURA MX-330 / FANUC 31I-B5)', 'G90 G17 G40 G49 G80',
          '(FACE MILL D50)', 'N10 T1 M6', 'N20 G54.4 P1', 'N30 G0 G90 G54 A0 C0', 'N40 S4000 M3', 'N50 G43.4 H1 Z50', 'N60 X-60 Y-20',
          'N70 Z2', 'N80 G1 Z0 F800', 'N90 X60', 'N100 Y0', 'N110 X-60', 'N120 Y20', 'N130 X60', 'N140 G0 Z50',
          '(POCKET ROUGH D12)', 'N200 T2 M6', 'N210 S8000 M3', 'N220 G43.4 H2 Z50', 'N230 G0 X-20 Y-10', 'N240 Z2', 'N250 G1 Z-5 F300',
          'N260 X20 F1200', 'N270 Y10', 'N280 X-20', 'N290 Y-10', 'N300 G0 Z50',
          '(5-AXIS CHAMFER D6)', 'N400 T3 M6', 'N410 S12000 M3', 'N420 G43.4 H3 Z50', 'N430 G0 A30 C45', 'N440 X-24 Y-14 Z5',
          'N450 G1 Z-1 F600', 'N460 G3 X-14 Y-24 R10', 'N470 G1 X14', 'N480 G3 X24 Y-14 R10', 'N490 G0 Z50 A0 C0',
          '(DRILL 4X D8.5)', 'N500 T4 M6', 'N510 S3000 M3', 'N520 G43 H4 Z50', 'N530 G81 X-30 Y-30 Z-25 R2 F250', 'N540 X30', 'N550 Y30',
          'N560 X-30', 'N570 G80', 'N580 G0 Z100 M5', 'N590 G28 G91 Z0', 'N600 M30', '%']}
    ]}
];
