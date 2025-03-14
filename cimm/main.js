// preload media
let thingsToLoad = [
  "img/Cimm_mc.png",
  "img/Cimm_mc_awake.png",
  "img/Cimm_mc_win.png",
  "snd/meow.mp3",
  "fonts/monogram.ttf"
];

// all UI text - switch translations here
var ui_text = {}
ui_text['title'] = '> Cimm'
ui_text['subtitle'] = 'you are a cat.'
ui_text['play'] = 'wake up?'
ui_text['about'] = '(about)'
ui_text['credits'] = '(credits)'
ui_text['sound'] = '(sound)'
ui_text['awake_waiting'] = "You're hungry."
ui_text['action1'] = 'Hunt a rat'
ui_text['action1_response'] = 'You catch a yummy rat and \nfeel fuller.'
ui_text['action2'] = 'Blink'
ui_text['action2_response'] = 'You blink your eyes. \nYou feel slightly more refreshed.'
ui_text['action3'] = 'Grab a lizard'
ui_text['action3_response'] = 'You sneak up on the tasty lizard and\nfeel slightly fuller.'
ui_text['action4'] = 'Meow'
ui_text['action4_response'] = '~ meow ^_^'
ui_text['action5'] = 'Catch a bug'
ui_text['action5_response'] = 'You swat a small bug. \nIt fills you sligtly.'
ui_text['action6'] = 'Sniff flowers'
ui_text['action6_response'] = 'Stop and smell the \nspring time flowers!'
ui_text['too_hungry_fail'] = "You faint from hunger. \n\nThankfully, you're not alone, \nand you've got friends \nto bring you food."
ui_text['win'] = "You did it! You're full! \nYou get to spend the rest of the day \nplaying in flowers, and settle down \nfor a comfy nap."
ui_text['too_stressed_fail'] = "You're too tired! \n\nYou can't ... keep ... going ... \n\n(you take a nap)"

// global variables
let music, music_toggle, playscene, endscene, titlescene, update_stress_hunger

/**
* Randomize array element order in-place.
* Using Durstenfeld shuffle algorithm.
* from https://stackoverflow.com/a/12646864
*/
function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}

//Create a new Hexi instance, and start it.
let g = hexi(2048, 2048, setup, thingsToLoad);

g.border = "2px red dashed";
g.scaleToWindow();
g.start();


// show loading bar
function load(){
  g.loadingBar();
}

function setup() {
  g.fps = 10;
  console.log("setup");

  // Settings
  stress_init = 0.1;
  fullness_init = 0.25;
  action_text_font = "120px Monogram";
  action_text_col = "black";
  action_text_prefix = "> ";

  // Init vars
  actions = [];
  stress = 0; // reinitialize on play
  fullness = 0; // reinitialize on play
  awake = false;
  ticks_since_last_action = 0;

  awakescene = g.group();
  // build fake background
  fb_bg = g.rectangle(2048, 2048, "black");
  bg_bg = g.rectangle(2048, 2048, "white");
  awakescene.addChild(fb_bg);
  awakescene.addChild(bg_bg);

  // Alter variables, check for win/fail states
  function update_stress_hunger(stress_d, fullness_d, reset_ticks_n){
    stress += stress_d;
    if (stress < 0){ // overflow hack
      stress = 0;
    }
    fullness += fullness_d
    //ticks_since_last_action = reset_ticks_n
    if (stress >= 1){
      // burnout fail
      g.fadeOut(awakescene, 10);
      awakescene.visible = false;
      stress_fail_scene.visible = true;
      g.fadeIn(stress_fail_scene, 10);
    }
    else if (fullness < 0){
      // hunger fail
      fullness = 0.1; // prevent hunger bar overflow
      g.fadeOut(awakescene, 10);
      awakescene.visible = false;
      hunger_fail_scene.visible = true;
      g.fadeIn(hunger_fail_scene, 10);
    }
    else if (fullness > 1){
      g.fadeOut(awakescene, 10);
      awakescene.visible = false;
      winscene.visible = true;
      g.fadeIn(winscene, 10);
    }
    hunger_bar.inner.height = 2000*fullness;
    awakescene.alpha = 0.1 + (0.9 * (1-stress))
    // console.log("Stress at "+stress+", Fullness at "+fullness)
  }

  let meow = g.sound("snd/meow.mp3");
  // Configure actions
  function makeAction(action_text, success_text, stress_d, fullness_d){
    action = g.text(action_text_prefix+action_text, action_text_font, action_text_col);
    action.interactive = true;
    //action.tap = () => update_stress_hunger(stress_d, fullness_d, 0);
    action.click = () => {
      update_stress_hunger(stress_d, fullness_d, 24);
      action_reponse.content = success_text;
      if (action_text==ui_text['action4']){ // hack for meows
        meow.play();
      }
      awake_reset();
    }
    awakescene.addChild(action);
    return action;
  };

  // get rat
  actions.push(makeAction(ui_text['action1'], ui_text['action1_response'], 0.2, 0.1));
  // blink
  actions.push(makeAction(ui_text['action2'], ui_text['action2_response'], -0.1, -0.01));
  // sneak up on lizard
  actions.push(makeAction(ui_text['action3'], ui_text['action3_response'], 0.1, 0.05));
  // meow
  actions.push(makeAction(ui_text['action4'], ui_text['action4_response'], -0.2, -0.01));
  // get bug
  actions.push(makeAction(ui_text['action5'], ui_text['action5_response'], 0.1, 0.01));
  // sniff flowers
  actions.push(makeAction(ui_text['action6'], ui_text['action6_response'], -0.2, -0.05));

  awake_status = g.text("> "+ui_text['awake_waiting'], "240px Monogram", "black");
  g.stage.putTop(awake_status, -100, 300);
  awakescene.addChild(awake_status);

  action_reponse = g.text("", "120px Monogram", "black");
  g.stage.putRight(action_reponse, -1900, -600);
  awakescene.addChild(action_reponse);

  // Make title components
  titlescene = g.group();

  //Add title
  title = g.text(ui_text['title'], "240px Monogram", "black");
  g.stage.putTop(title, -600, 300);
  titlescene.addChild(title)

  // Add subtitle
  subtitle = g.text(ui_text['subtitle'], "240px Monogram", "black");
  g.stage.putRight(subtitle, -1900, -600);
  titlescene.addChild(subtitle);

  // music toggle
  sound_btn = g.text(ui_text['sound'], "120px Monogram", "black");
  g.stage.putRight(sound_btn, -350, -950);
  titlescene.addChild(sound_btn)

  sound_btn.interactive = true;
  sound_btn.click = () => {
    if (music.paused){
      music.play();
    } else {
      music.pause();
    }
  }

  // Add play button
  play_button = g.text("> "+ui_text['play'], "120px Monogram", "black");
  g.stage.putRight(play_button, -1900, 300);
  titlescene.addChild(play_button);

  // make it clickable
  play_button.interactive = true;
  // play_button.tap = () => console.log("The current text was tapped");
  play_button.click = () => {
    wake_up = g.fadeOut(titlescene, 10);
    wake_up.onComplete = () => {
      stress = stress_init;
      fullness = fullness_init;
      action_reponse.content = "";
      awake_reset();
      titlescene.visible = false;
      awakescene.visible = true;
      g.fadeIn(awakescene, 10);
      update_stress_hunger(0,0,24);
    }
  }

  // add cat
  main_kitty_anim = g.filmstrip("img/Cimm_mc.png", 352, 352);
  main_kitty = g.sprite(main_kitty_anim);
  main_kitty.fps = 2;
  main_kitty.playAnimation([0,2]);
  main_kitty.setScale(1.5,1.5);
  main_kitty.setPosition(800,700);
  titlescene.addChild(main_kitty);

  main_kitty_anim_awake = g.filmstrip("img/Cimm_mc_awake.png", 352, 352);
  main_kitty_awake = g.sprite(main_kitty_anim_awake);
  main_kitty_awake.fps = 2;
  main_kitty_awake.playAnimation([0,2]);
  main_kitty_awake.setScale(1.5,1.5);
  main_kitty_awake.setPosition(800,700);
  awakescene.addChild(main_kitty_awake);

  // Create BeepBox synth
  music = new beepbox.Synth("8n10s0k0l00e05t1Um0a7g09j04i0r1o3T5v1u32q1d5f8y1z7C1c0h0HU7000U0006000Eb9jB00p21nFEYzwieCCCCS1F8W2eyEzRAt97lnjjjhhjjhjjEFFFFEEFFEbWqqqtd9vhhkhT4t97ihQAuMzG8WieCEzGFHIcI");

  // add music
  music.play();

  // build hunger bar
  outerBar = g.rectangle(50, 2000, "black");
  innerBar = g.rectangle(30, 1980, "white");
  innerBar.x += 10;
  innerBar.y += 10;
  hunger_bar = g.group(outerBar, innerBar);
  hunger_bar.inner = innerBar;
  hunger_bar.setPosition(20,20);

  awakescene.addChild(hunger_bar);

  // Rebuild screen between button presses
  function awake_reset(){
    shuffleArray(actions);
    g.stage.putRight(actions[0], -1000, 600);
    g.stage.putRight(actions[1], -1000, 300);
    g.stage.putRight(actions[2], -1000, 900);
    g.stage.putRight(actions[3], -1900, 300);
    g.stage.putRight(actions[4], -1900, 600);
    g.stage.putRight(actions[5], -1900, 900);
  }

  // build win screen
  winscene = g.group();

  // pink background
  win_bg = g.rectangle(2048, 2048, 0xffccf1);
  winscene.addChild(win_bg);

  win_kitty_anim = g.filmstrip("img/Cimm_mc_win.png", 352, 352);
  win_kitty = g.sprite(win_kitty_anim);
  win_kitty.fps = 2;
  win_kitty.playAnimation([0,8]);
  win_kitty.setScale(1.5,1.5);
  win_kitty.setPosition(800,700);
  winscene.addChild(win_kitty);

  win_text = g.text(ui_text['win'], "120px Monogram", "black");
  g.stage.putRight(win_text, -1900, -700);
  winscene.addChild(win_text);

  // Add play button
  play_button_win = g.text("> "+ui_text['play'], "120px Monogram", "black");
  g.stage.putRight(play_button_win, -1900, 300);
  // make it clickable
  play_button_win.interactive = true;
  winscene.addChild(play_button_win)
  // play_button_win.tap = () => console.log("The current text was tapped");
  play_button_win.click = () => {
    wake_up = g.fadeOut(winscene, 10);
    wake_up.onComplete = () => {
      stress = stress_init;
      fullness = fullness_init;
      action_reponse.content = "";
      awake_reset();
      winscene.visible = false;
      awakescene.visible = true;
      g.fadeIn(awakescene, 10);
      update_stress_hunger(0,0,24);
    }
  }


  // fail screen (too hungry)
  hunger_fail_scene = g.group();

  // grey background
  fail1_bg = g.rectangle(2048, 2048, "grey");
  hunger_fail_scene.addChild(fail1_bg);

  fail1_text = g.text(ui_text['too_hungry_fail'], "120px Monogram", "black");
  g.stage.putRight(fail1_text, -1900, -700);
  hunger_fail_scene.addChild(fail1_text);

  // Add play button
  play_button_fail1 = g.text("> "+ui_text['play'], "120px Monogram", "black");
  g.stage.putRight(play_button_fail1, -1900, 300);
  // make it clickable
  play_button_fail1.interactive = true;
  hunger_fail_scene.addChild(play_button_fail1);
  // play_button_win.tap = () => console.log("The current text was tapped");
  play_button_fail1.click = () => {
    wake_up = g.fadeOut(hunger_fail_scene, 10);
    wake_up.onComplete = () => {
      stress = stress_init;
      fullness = fullness_init;
      action_reponse.content = "";
      awake_reset();
      hunger_fail_scene.visible = false;
      awakescene.visible = true;
      g.fadeIn(awakescene, 10);
      update_stress_hunger(0,0,24);
    }
  }

  // fail screen (too stressed)
  stress_fail_scene = g.group();

  // grey background
  fail2_bg = g.rectangle(2048, 2048, "grey");
  stress_fail_scene.addChild(fail2_bg);

  fail2_text = g.text(ui_text['too_stressed_fail'], "120px Monogram", "black");
  g.stage.putRight(fail2_text, -1900, -700);
  stress_fail_scene.addChild(fail2_text);

  // Add play button
  play_button_fail2 = g.text("> "+ui_text['play'], "120px Monogram", "black");
  g.stage.putRight(play_button_fail2, -1900, 300);
  // make it clickable
  play_button_fail2.interactive = true;
  stress_fail_scene.addChild(play_button_fail2);
  // play_button_win.tap = () => console.log("The current text was tapped");
  play_button_fail2.click = () => {
    wake_up = g.fadeOut(hunger_fail_scene, 10);
    wake_up.onComplete = () => {
      stress = stress_init;
      fullness = fullness_init;
      action_reponse.content = "";
      awake_reset();
      stress_fail_scene.visible = false;
      awakescene.visible = true;
      g.fadeIn(awakescene, 10);
      update_stress_hunger(0,0,24);
    }
  }

  // Hide other scenes
  awakescene.alpha = 0;
  awakescene.visible = false;
  winscene.alpha = 0;
  winscene.visible = false;
  hunger_fail_scene.alpha = 0;
  hunger_fail_scene.visible = false;
  stress_fail_scene.alpha = 0;
  stress_fail_scene.visible = false;

  // Run game
  g.state = play;

}

function play() {
  // do I need this?

  // if (awake){
  //   ticks_since_last_action += 1;
  //   if (ticks_since_last_action>24){
  //     update_stress_hunger(0, -0.01, 12);
  //   }
  // }

}
