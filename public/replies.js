
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
  { match: /^(\/fight|\/boss|fight me)$/i, text: ["oh you want to fight?", "fine."], then: "boss" },
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
