
const REPLIES = {
  who: {
    text: [[
      "im sein, i was unfortunately chosen to be the best graduate of 24/25 and the new language coordinator of TSA",
      "also i draw, animate and make websites",
    ]],
    audio: null,
  },
  love: {
    text: [["gesss jan gitu dong.", "but im open to that. DM me on instagram @sein.ramadhan ( ˘ ³˘)"]],
    audio: "assets/audio/naksir.mp3",
  },
  insult: {
    text: ["what your problem man? i did nothing to u guys"],
    audio: null,
  },
  why_did_you_make_this: {
    text: ["because Mr.Ali akbar assign me this task? just like you guys?"],
    audio: null,
  },
  AI: {
    text: ["sorry ges ada yg namanya VIBECODING, mohon maap"],
    audio: null,
  },
  unknown: {
    text: ["uhhh how do you want me to respond to that"],
    audio: null,
  },
  social_media: {
    text: ["you can find me on instagram @sein.ramadhan"],
    audio: null,
  },

  // placeholders — replace with your own
  greeting: {
    text: ["Hello.( ˘ ³˘)"],
    audio: null,
  },
  compliment: {
    text: ["thanks. i know.", "stop, i'll get used to it."],
    audio: null,
  },
  how_are_you: {
    text: ["still here.", "tired. but still here."],
    audio: null,
  },
  work: {
    text: ["you want to see my work? scroll down. don't actually i will die"],
    audio: null,
  },
  joke: {
    text: ["i'm not that funny.", "ha. ha."],
    audio: null,
  },
  leave: {
    text: ["leaving already?"],
    audio: null,
    next: "confirm",
  },
};

// secret chat commands: typed exactly, they skip the AI. "then" is what happens after he talks.
const SECRET_COMMANDS = [
  { match: /^\/?help$/i, text: ["commands? who told you there were commands.", "try /fight. or don't."] },
  { match: /^sudo\b/i, text: ["you're not root here.", "i am."] },
  { match: /^\/?chaos( mode)?$/i, text: ["okay. you asked for it."], then: "chaos" },
  { match: /^(\/fight|\/boss|fight me)( [123])?$/i, text: ["oh you want to fight?", "fine."], then: "boss" }, // "/fight 3": admin, straight to that phase
  { match: /konami|up up down down/i, text: ["↑ ↑ ↓ ↓ ← → ← → B A.", "you didn't hear it from me."] },
  { match: /^\/?(still here|refuse)$/i, text: ["...", "yeah. i am."] },
];

const OPENING_LINE = "hey. type something.";
const STAY_LINE = "thought so. stay a bit.";
const GUNSHOT_AUDIO = "assets/gunshot.mp3";
const GLITCH_AUDIO = "assets/glicth_sound_effect.mp3"; // plays when the hero glitches into the chat
const SOUL_SHATTER_AUDIO = "assets/undertale-soul-shatter.mp3"; // the SOUL breaks to this, then fuses back to it played in reverse
const HEARTBEAT_AUDIO = "assets/dying heart beep.mp3"; // the tragic scene's ECG beeps are timed to this file
const AIMED_AT_IMAGE = "assets/point at.png"; // shown while the gun is pointed at him
const SHOT_IMAGE = "assets/shot.png"; // shown after the shot; falls back to a slump animation until this file exists

// while the gun is pointed at him he keeps talking, and reacts to what you shoot.
// edit freely: each list is picked from at random (MISS goes in order, then repeats the last few)
const AIM_LINES = {
  first: "wait wait wait. we can talk about this.",
  idle: [
    "you're really gonna do this?",
    "my mom is gonna see this website.",
    "put it down. we can talk.",
    "i have a whole portfolio to show you.",
    "your hand is shaking btw.",
    "the gun is drawn on paper. it's fine. probably.",
    "i didn't even finish my drawings.",
    "is this because of the chatbot?",
  ],
  miss: [
    "you missed.",
    "the wall did nothing to you.",
    "are you aiming with your elbow?",
    "stormtrooper aim.",
    "i'm right here. like, RIGHT here.",
    "ok now you're just decorating.",
  ],
  near: [
    "THAT WAS CLOSE.",
    "i felt the wind from that one.",
    "okay okay okay okay",
  ],
  // shooting one of the floating windows: keyed by its title without ".mov"
  window: {
    drawing: ["MY DRAWINGS??", "that one took me three nights. thanks."],
    animation: ["bro that was 400 frames.", "do you know how long keyframing takes??"],
    web: ["ok that one was still loading anyway.", "...that was the only thing that worked."],
  },
  allWindows: "great. now there's nothing left on screen but me.",
};

// the long way round: hold the gun on him for 5 minutes without shooting HIM and he lets you in.
// t is seconds of holding. image (optional) changes his photo at that beat. ifShot replaces the
// line if you've shot one of his floating windows by then.
const SPARE_AFTER = 300;
const AIM_STORY = [
  { t: 12, line: "okay. you're not shooting. that's good. let's keep it like that." },
  { t: 28, line: "so. hi. i'm sein. normally i'd say that without a gun involved." },
  { t: 44, line: "fun fact: i'm cadel. there are 5 letters i can't say properly. grade 7 me hated talking." },
  { t: 60, line: "then in grade 8 i joined every competition i could find. i don't even remember most of them." },
  { t: 76, line: "grade 9 i somehow became best graduate. there was prize money. i'm still not over it." },
  { t: 92, line: "then TSA accepted me and my grades immediately fell off a cliff. worth it? jury's still out." },
  { t: 108, line: "now i'm the language coordinator. the cadel kid. coordinating language. you see the irony." },
  { t: 126, line: "...your arm has to be tired by now." },
  { t: 142, line: "okay i'm sitting down. you can still shoot me sitting. but you won't. right?", image: "assets/sit.png" },
  { t: 160, line: "see those floating windows? that's where my drawings and animations go. don't shoot them.",
    ifShot: "the windows you shot were gonna be my drawings and animations btw. no pressure." },
  { t: 178, line: "i drew everything on this site in ibisPaint. on my phone. at 2am. mostly." },
  { t: 194, line: "this whole website is a school task. Mr. Ali Akbar, if you're reading this, i'm fine." },
  { t: 210, line: "i'm starting to think you just like holding the gun." },
  { t: 226, line: "real talk: if you shoot me there's a whole dramatic death scene. i worked hard on it." },
  { t: 242, line: "but if you wait... i didn't think anyone would wait. so i didn't plan anything." },
  { t: 258, line: "...i'm planning something now. give me a sec." },
  { t: 274, line: "okay. decided. make it to five minutes and you get in without the drama.", image: "assets/stand.png" },
  { t: 288, line: "almost there. don't ruin it." },
  { t: 295, line: "five." },
  { t: 296, line: "four." },
  { t: 297, line: "three." },
  { t: 298, line: "two." },
  { t: 299, line: "one..." },
];
// when the 5 minutes are up
const SPARED_LINES = [
  "...you actually waited.",
  "nobody waits. everyone just shoots.",
  "okay. you earned it. come in.",
];
const SPARED_SUB = "you waited. nobody waits.";

// shooting the bits of the page itself (only while the gun is out)
AIM_LINES.ui = {
  logo: ["that's my NAME.", "you shot my brand. i don't even have a brand."],
  lock: ["nice try. bullets don't unlock scroll.", "it's locked. like, emotionally."],
  clock: ["shooting the clock doesn't stop the clock.", "time is still passing. i checked."],
  hint: ["you shot the instructions.", "the instructions did nothing to you."],
  hintAfter: "ok fine. figure it out yourself.",
  // in order: when it gets out, while it stares at you, after it goes back in
  chaos: ["WHAT DID YOU DO", "don't look at it. DON'T LOOK AT IT.", "...it's in the website now. great."],
  chaosAgain: ["you already broke that one.", "it's still in there. don't."],
};
// shooting his speech bubble
AIM_LINES.ui.bubble = ["rude. i was TALKING.", "you shot my words.", "wow. ok. i'll start over then."];
