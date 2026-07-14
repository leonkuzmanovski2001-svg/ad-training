/* AD Training — static data: exercise library, default plan, seed foods */
'use strict';

/* Exercise library.
   g = muscle group, e = equipment, c = form cue, r = rest seconds
   (120 big compounds / 90 accessories / 60 abs & calves) */
const EXERCISES = [
  // Chest
  { i: 'bench',        n: 'Barbell Bench Press',       g: 'Chest',      e: 'Barbell',    r: 120, c: 'Shoulder blades pinned, feet planted, bar to mid-chest.' },
  { i: 'incbench',     n: 'Incline Barbell Press',     g: 'Chest',      e: 'Barbell',    r: 120, c: '30° incline, bar to upper chest, elbows ~45°.' },
  { i: 'dbbench',      n: 'Dumbbell Bench Press',      g: 'Chest',      e: 'Dumbbell',   r: 120, c: 'Deep stretch at the bottom, press up and slightly in.' },
  { i: 'incdbpress',   n: 'Incline Dumbbell Press',    g: 'Chest',      e: 'Dumbbell',   r: 90,  c: 'Keep wrists stacked over elbows, control the negative.' },
  { i: 'dip',          n: 'Weighted Dip',              g: 'Chest',      e: 'Bodyweight', r: 120, c: 'Lean forward, elbows back, go to 90° or deeper.' },
  { i: 'cablefly',     n: 'Cable Fly',                 g: 'Chest',      e: 'Cable',      r: 90,  c: 'Soft elbows, hug a barrel, squeeze at the midline.' },
  { i: 'pecdeck',      n: 'Pec Deck',                  g: 'Chest',      e: 'Machine',    r: 90,  c: 'Elbows slightly below shoulders, pause the squeeze.' },
  { i: 'machpress',    n: 'Machine Chest Press',       g: 'Chest',      e: 'Machine',    r: 90,  c: 'Set handles at nipple height, full lockout without shrugging.' },
  { i: 'pushup',       n: 'Push-Up',                   g: 'Chest',      e: 'Bodyweight', r: 90,  c: 'Rigid plank, chest to the floor, full lockout.' },
  // Back
  { i: 'deadlift',     n: 'Deadlift',                  g: 'Back',       e: 'Barbell',    r: 120, c: 'Brace hard, push the floor away, bar stays on the legs.' },
  { i: 'bbrow',        n: 'Barbell Row',               g: 'Back',       e: 'Barbell',    r: 120, c: 'Hinge to ~45°, pull to lower ribs, no torso heave.' },
  { i: 'pullup',       n: 'Pull-Up',                   g: 'Back',       e: 'Bodyweight', r: 120, c: 'Dead hang start, chest to bar, control the way down.' },
  { i: 'chinup',       n: 'Chin-Up',                   g: 'Back',       e: 'Bodyweight', r: 120, c: 'Supinated grip, drive elbows to hips.' },
  { i: 'latpull',      n: 'Lat Pulldown',              g: 'Back',       e: 'Cable',      r: 90,  c: 'Slight lean back, pull the bar to the collarbone.' },
  { i: 'cablerow',     n: 'Seated Cable Row',          g: 'Back',       e: 'Cable',      r: 90,  c: 'Chest tall, pull to the navel, squeeze the blades.' },
  { i: 'tbarrow',      n: 'T-Bar Row',                 g: 'Back',       e: 'Barbell',    r: 120, c: 'Flat back, drive elbows past the torso.' },
  { i: 'dbrow',        n: 'Single-Arm Dumbbell Row',   g: 'Back',       e: 'Dumbbell',   r: 90,  c: 'Square hips, row to the hip pocket, no rotation.' },
  { i: 'sapulldown',   n: 'Straight-Arm Pulldown',     g: 'Back',       e: 'Cable',      r: 90,  c: 'Arms long, sweep the bar to the thighs with the lats.' },
  { i: 'rackpull',     n: 'Rack Pull',                 g: 'Back',       e: 'Barbell',    r: 120, c: 'Set pins at knee height, brace like a deadlift.' },
  { i: 'machrow',      n: 'Machine Row',               g: 'Back',       e: 'Machine',    r: 90,  c: 'Chest on the pad, pull with the elbows not the hands.' },
  // Shoulders
  { i: 'ohp',          n: 'Overhead Press',            g: 'Shoulders',  e: 'Barbell',    r: 120, c: 'Glutes tight, ribs down, press to a full lockout.' },
  { i: 'dbshpress',    n: 'Seated Dumbbell Press',     g: 'Shoulders',  e: 'Dumbbell',   r: 90,  c: 'Back on the pad, lower to ear level, press up and in.' },
  { i: 'arnold',       n: 'Arnold Press',              g: 'Shoulders',  e: 'Dumbbell',   r: 90,  c: 'Rotate palms out as you press, smooth tempo.' },
  { i: 'latraise',     n: 'Lateral Raise',             g: 'Shoulders',  e: 'Dumbbell',   r: 90,  c: 'Lead with the elbows, pour the jugs at the top.' },
  { i: 'cablelat',     n: 'Cable Lateral Raise',       g: 'Shoulders',  e: 'Cable',      r: 90,  c: 'Cable behind the body, constant tension, no swing.' },
  { i: 'reardelt',     n: 'Rear Delt Fly',             g: 'Shoulders',  e: 'Dumbbell',   r: 90,  c: 'Hinge over, thumbs down, sweep wide not back.' },
  { i: 'facepull',     n: 'Face Pull',                 g: 'Shoulders',  e: 'Cable',      r: 90,  c: 'Pull to the forehead, end in a double-biceps pose.' },
  { i: 'uprightrow',   n: 'Upright Row',               g: 'Shoulders',  e: 'Barbell',    r: 90,  c: 'Wide grip, elbows lead, stop at chest height.' },
  { i: 'machshpress',  n: 'Machine Shoulder Press',    g: 'Shoulders',  e: 'Machine',    r: 90,  c: 'Elbows under wrists, press without shrugging.' },
  // Biceps
  { i: 'bbcurl',       n: 'Barbell Curl',              g: 'Biceps',     e: 'Barbell',    r: 90,  c: 'Elbows pinned to the ribs, no lower-back swing.' },
  { i: 'ezcurl',       n: 'EZ-Bar Curl',               g: 'Biceps',     e: 'EZ-Bar',     r: 90,  c: 'Semi-supinated grip, squeeze hard at the top.' },
  { i: 'dbcurl',       n: 'Dumbbell Curl',             g: 'Biceps',     e: 'Dumbbell',   r: 90,  c: 'Supinate as you curl, control the negative.' },
  { i: 'hammercurl',   n: 'Hammer Curl',               g: 'Biceps',     e: 'Dumbbell',   r: 90,  c: 'Neutral grip, curl across slightly for the brachialis.' },
  { i: 'inccurl',      n: 'Incline Dumbbell Curl',     g: 'Biceps',     e: 'Dumbbell',   r: 90,  c: 'Arms hang behind the torso, deep stretch each rep.' },
  { i: 'preacher',     n: 'Preacher Curl',             g: 'Biceps',     e: 'EZ-Bar',     r: 90,  c: 'Armpits on the pad, never fully relax at the bottom.' },
  { i: 'cablecurl',    n: 'Cable Curl',                g: 'Biceps',     e: 'Cable',      r: 90,  c: 'Step back for constant tension, elbows still.' },
  // Triceps
  { i: 'cgbench',      n: 'Close-Grip Bench Press',    g: 'Triceps',    e: 'Barbell',    r: 120, c: 'Grip just inside shoulders, elbows tucked, touch low.' },
  { i: 'skullcrush',   n: 'Skull Crusher',             g: 'Triceps',    e: 'EZ-Bar',     r: 90,  c: 'Lower behind the head, elbows fixed, press to lockout.' },
  { i: 'pushdown',     n: 'Triceps Pushdown',          g: 'Triceps',    e: 'Cable',      r: 90,  c: 'Elbows glued to the sides, full extension, slow return.' },
  { i: 'ohcableext',   n: 'Overhead Cable Extension',  g: 'Triceps',    e: 'Cable',      r: 90,  c: 'Face away, arms overhead, stretch the long head.' },
  { i: 'ohdbext',      n: 'Overhead Dumbbell Extension', g: 'Triceps',  e: 'Dumbbell',   r: 90,  c: 'Both hands under the plate, lower deep behind the head.' },
  { i: 'benchdip',     n: 'Bench Dip',                 g: 'Triceps',    e: 'Bodyweight', r: 90,  c: 'Hips close to the bench, elbows straight back.' },
  { i: 'diamondpu',    n: 'Diamond Push-Up',           g: 'Triceps',    e: 'Bodyweight', r: 90,  c: 'Hands form a diamond under the chest, elbows tucked.' },
  // Quads
  { i: 'squat',        n: 'Back Squat',                g: 'Quads',      e: 'Barbell',    r: 120, c: 'Big breath, sit between the hips, drive the floor apart.' },
  { i: 'frontsquat',   n: 'Front Squat',               g: 'Quads',      e: 'Barbell',    r: 120, c: 'Elbows high, torso vertical, knees travel forward.' },
  { i: 'legpress',     n: 'Leg Press',                 g: 'Quads',      e: 'Machine',    r: 120, c: 'Feet mid-platform, lower until hips want to tuck, stop.' },
  { i: 'hacksquat',    n: 'Hack Squat',                g: 'Quads',      e: 'Machine',    r: 120, c: 'Back flat on the pad, deep knee bend, drive through mid-foot.' },
  { i: 'bulgarian',    n: 'Bulgarian Split Squat',     g: 'Quads',      e: 'Dumbbell',   r: 90,  c: 'Rear foot elevated, drop straight down, front heel heavy.' },
  { i: 'lunge',        n: 'Walking Lunge',             g: 'Quads',      e: 'Dumbbell',   r: 90,  c: 'Long stride, gentle knee touch, push through the front leg.' },
  { i: 'legext',       n: 'Leg Extension',             g: 'Quads',      e: 'Machine',    r: 90,  c: 'Toes up, pause the squeeze at full extension.' },
  // Hamstrings
  { i: 'rdl',          n: 'Romanian Deadlift',         g: 'Hamstrings', e: 'Barbell',    r: 120, c: 'Hips back, soft knees, bar glued to the thighs.' },
  { i: 'sldl',         n: 'Stiff-Leg Deadlift',        g: 'Hamstrings', e: 'Barbell',    r: 120, c: 'Legs near-straight, stretch to below the knees.' },
  { i: 'lyingcurl',    n: 'Lying Leg Curl',            g: 'Hamstrings', e: 'Machine',    r: 90,  c: 'Hips pressed into the pad, curl heel to glute.' },
  { i: 'seatedcurl',   n: 'Seated Leg Curl',           g: 'Hamstrings', e: 'Machine',    r: 90,  c: 'Lean forward slightly for a deeper hamstring stretch.' },
  { i: 'goodmorning',  n: 'Good Morning',              g: 'Hamstrings', e: 'Barbell',    r: 90,  c: 'Bar on the traps, hinge until the hams scream, stand tall.' },
  // Glutes
  { i: 'hipthrust',    n: 'Hip Thrust',                g: 'Glutes',     e: 'Barbell',    r: 120, c: 'Chin tucked, ribs down, full lockout with a hard squeeze.' },
  { i: 'glutebridge',  n: 'Glute Bridge',              g: 'Glutes',     e: 'Bodyweight', r: 90,  c: 'Heels close, drive hips up, pause 2s at the top.' },
  { i: 'kickback',     n: 'Cable Kickback',            g: 'Glutes',     e: 'Cable',      r: 90,  c: 'Slight forward lean, kick back and up, no lumbar arch.' },
  { i: 'sumodl',       n: 'Sumo Deadlift',             g: 'Glutes',     e: 'Barbell',    r: 120, c: 'Wide stance, knees out over toes, wedge in and push.' },
  // Abs
  { i: 'hlr',          n: 'Hanging Leg Raise',         g: 'Abs',        e: 'Bodyweight', r: 60,  c: 'Posterior tilt first, curl the pelvis, no swinging.' },
  { i: 'cablecrunch',  n: 'Cable Crunch',              g: 'Abs',        e: 'Cable',      r: 60,  c: 'Hips still, crunch the ribs to the pelvis.' },
  { i: 'abwheel',      n: 'Ab Wheel Rollout',          g: 'Abs',        e: 'Bodyweight', r: 60,  c: 'Tuck the pelvis, roll out only as far as you can hold.' },
  { i: 'plank',        n: 'Plank',                     g: 'Abs',        e: 'Bodyweight', r: 60,  c: 'Squeeze glutes and abs, one straight line, breathe.' },
  { i: 'russiantwist', n: 'Russian Twist',             g: 'Abs',        e: 'Bodyweight', r: 60,  c: 'Lean back 45°, rotate from the ribs, not the arms.' },
  { i: 'declinesit',   n: 'Decline Sit-Up',            g: 'Abs',        e: 'Bodyweight', r: 60,  c: 'Curl up one vertebra at a time, control the descent.' },
  { i: 'bicycle',      n: 'Bicycle Crunch',            g: 'Abs',        e: 'Bodyweight', r: 60,  c: 'Slow opposite elbow-to-knee, shoulder blades off the floor.' },
  { i: 'deadbug',      n: 'Dead Bug',                  g: 'Abs',        e: 'Bodyweight', r: 60,  c: 'Lower back welded to the floor, opposite arm and leg.' },
  // Calves
  { i: 'standcalf',    n: 'Standing Calf Raise',       g: 'Calves',     e: 'Machine',    r: 60,  c: 'Full stretch at the bottom, 2s pause at the top.' },
  { i: 'seatcalf',     n: 'Seated Calf Raise',         g: 'Calves',     e: 'Machine',    r: 60,  c: 'Bent-knee hits the soleus, slow full range.' },
  { i: 'lpcalf',       n: 'Leg Press Calf Raise',      g: 'Calves',     e: 'Machine',    r: 60,  c: 'Toes on the platform edge, deep stretch, no bounce.' },
  { i: 'slcalf',       n: 'Single-Leg Calf Raise',     g: 'Calves',     e: 'Bodyweight', r: 60,  c: 'On a step, hold something for balance only, not help.' },
];

const EX_BY_ID = Object.fromEntries(EXERCISES.map(e => [e.i, e]));
const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Glutes', 'Abs', 'Calves'];

/* Default weekly plan — index 0 = Monday. Push/Pull/Legs ×2 with PM core work. */
const DEFAULT_PLAN = [
  { am: ['bench', 'ohp', 'incdbpress', 'latraise', 'pushdown'],        pm: ['hlr', 'cablecrunch', 'plank'] },        // Mon — Push A / Abs
  { am: ['deadlift', 'pullup', 'cablerow', 'facepull', 'bbcurl'],      pm: [] },                                     // Tue — Pull A
  { am: ['squat', 'rdl', 'legpress', 'lyingcurl', 'standcalf'],        pm: ['abwheel', 'russiantwist'] },            // Wed — Legs A / Abs
  { am: [],                                                            pm: [] },                                     // Thu — Rest
  { am: ['incbench', 'dbshpress', 'dip', 'cablefly', 'skullcrush'],    pm: [] },                                     // Fri — Push B
  { am: ['bbrow', 'latpull', 'reardelt', 'hammercurl', 'sapulldown'], pm: ['seatcalf', 'cablecrunch'] },            // Sat — Pull B / Calves+Abs
  { am: [],                                                            pm: [] },                                     // Sun — Rest
];

/* Seed quick-add foods: k = kcal, p = protein grams */
const DEFAULT_FOODS = [
  { id: 'f1', name: 'Chicken Breast 200g', k: 330, p: 62 },
  { id: 'f2', name: 'Greek Yogurt 200g',   k: 130, p: 20 },
  { id: 'f3', name: '3 Whole Eggs',        k: 215, p: 19 },
  { id: 'f4', name: 'Whey Scoop',          k: 120, p: 24 },
  { id: 'f5', name: 'Rice 100g (dry)',     k: 360, p: 7  },
  { id: 'f6', name: 'Oats 80g',            k: 300, p: 11 },
  { id: 'f7', name: 'Tuna Can 145g',       k: 150, p: 33 },
  { id: 'f8', name: 'Protein Bar',         k: 210, p: 20 },
];

const DEFAULT_TARGETS = { kcal: 2050, protein: 160, goalWeight: 74, goalMuscle: 38, goalFat: 12 };
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
