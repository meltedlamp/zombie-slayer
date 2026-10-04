(function (root) {
  function match(when, s) {
    if (!when) return true;
    for (const [k, v] of Object.entries(when)) {
      if (k.endsWith("_gte")) {
        if ((s[k.slice(0, -4)] ?? 0) < v) return false;
      } else if (k.endsWith("_lte")) {
        if ((s[k.slice(0, -4)] ?? 0) > v) return false;
      } else if (k.endsWith("_nin")) {
        if (v.includes(s[k.slice(0, -4)])) return false;
      } else if (k.endsWith("_gt")) {
        if ((s[k.slice(0, -3)] ?? 0) <= v) return false;
      } else if (k.endsWith("_lt")) {
        if ((s[k.slice(0, -3)] ?? 0) >= v) return false;
      } else if (k.endsWith("_ne")) {
        if (s[k.slice(0, -3)] === v) return false;
      } else if (Array.isArray(v)) {
        if (!v.includes(s[k])) return false;
      } else if (s[k] !== v) return false;
    }
    return true;
  }

  function apply(set, s) {
    if (!set) return;
    for (const [k, v] of Object.entries(set)) {
      if (typeof v === "string" && /^[+-]\d+$/.test(v)) s[k] = (s[k] || 0) + Number(v);
      else s[k] = v;
    }
  }

  function fill(text, s) {
    return String(text).replaceAll("{name}", s.name || "Alex");
  }

  function resolve(from, s) {
    const n = from && from.next;
    if (!n) return null;
    if (typeof n === "string") return n;
    for (const b of n) if (match(b.when, s)) return b.id;
    return null;
  }

  const AFTER_GAS = [
    { when: { harris: "secret" }, id: "harris_check" },
    { when: { harris: "delayed" }, id: "harris_check" },
    { id: "bus_dark" },
  ];

  const NODES = {
    opening: {
      kind: "talk",
      card: "The Center",
      kicker: "Day 3  —  Millford",
      arena: "dojo",
      lines: [
        { text: "Day 3 of the outbreak. Phones are dead. The things in the parking lot are not." },
        { text: "A phone on the floor lights up anyway. The screen says MOM. It rings twice, in her ringtone, and then the same ring starts out in the lot, where nobody living is holding it." },
        { text: "Mom called at noon. She has Leo, your little brother. They are going to the army checkpoint on the river bridge. She told Mia to find you, and not to go with anyone else." },
        { text: "Mia made it to the community center. Dean from next door got stuck in here with you. The real sword from Saturday class is still locked at the school. Tonight you have a pipe and a short knife." },
        { speaker: "Mia", text: "Mom said find {name}. Then we go to the bridge. She has Leo. I'm not going with anybody else." },
        { speaker: "Dean", text: "I only came in to charge my phone. The side lot still looks empty. I want to leave." },
      ],
      choices: [
        { text: "We wait with the lights off. Mom knows this building. If she's close, she uses the side door.", set: { plan: "wait", juneTrust: "+1" }, log: "You told Mia you would wait a little longer for Mom.", next: "courtyard_reply" },
        { text: "We're not waiting. Stay behind my left shoulder. Don't look at their faces.", set: { plan: "cut" }, log: "You moved Mia before she was ready.", next: "courtyard_reply" },
        { text: "Dean, walk her to the car. I'll clear a path.", set: { plan: "harris", juneTrust: "-1", harris: "obvious" }, log: "You put Dean between Mia and the dead.", next: "courtyard_reply" },
      ],
    },
    courtyard_reply: {
      kind: "talk",
      arena: "dojo",
      place: "The Center",
      lines: [
        { speaker: "Mia", text: "Okay. Side door. I can be quiet.", when: { plan: "wait" } },
        { speaker: "Dean", text: "Quiet works until one of them hears us.", when: { plan: "wait" } },
        { speaker: "Mia", text: "Mom might still be on the road.", when: { plan: "cut" } },
        { text: "You put Mia on your left, away from the pipe.", when: { plan: "cut" } },
        { speaker: "Dean", text: "I didn't sign up to walk her through them.", when: { plan: "harris" } },
        { text: "You give him the car keys anyway. His hand is already shaking.", when: { plan: "harris" } },
        { speaker: "Mia", text: "Mom said not to go with anyone else.", when: { plan: "harris" } },
        { text: "They come through the front doors." },
      ],
      next: "voices_lot",
    },
    voices_lot: {
      kind: "black",
      arena: "dojo",
      log: "Something in the parking lot said Mia's name in Mom's voice.",
      text: "The lot is dark.\nSomething out there says Mia's name.\nIt uses Mom's voice. Warm. Exact.\nIt says the name again, closer, and this time the voice is wet.",
      next: "fight_glass",
    },
    fight_glass: {
      kind: "combat",
      arena: "dojo",
      place: "The Center",
      easy: true,
      tip: "Click cuts. Right mouse blocks. Space dodges. 1 is the pipe. 2 is the knife. Keep them in front of you. A red flash means they are about to grab.",
      spawn: [{ type: "shambler", count: 3 }],
      next: "shoe",
    },
    shoe: {
      kind: "talk",
      arena: "dojo",
      lines: [
        { text: "The lot goes quiet. The car is still there. Somewhere behind you, Mom's ringtone plays once and dies." },
        { text: "Dean wipes his shoe on the mat. The bite on his ankle is still moving after his foot stops.", when: { harris_ne: "obvious" } },
        { speaker: "Dean", text: "Ankle. I caught it on the door. I'm fine.", when: { harris: "obvious" } },
        { speaker: "Mia", text: "That's a bite. The skin around it is trying to crawl.", when: { harris: "obvious" } },
      ],
      choices: [
        { text: "Dean. Sit down and take the shoe off.", next: "confront" },
        { text: "Mia, seatbelt. We're leaving while the road is empty.", set: { harris: "secret" }, log: "You saw the blood on Dean's ankle and hid it from Mia.", next: "secret_leave", when: { harris_ne: "obvious" } },
      ],
    },
    confront: {
      kind: "talk",
      arena: "dojo",
      lines: [
        { speaker: "Dean", text: "Don't. Not in front of her. It's just a cut from the door." },
        { speaker: "Mia", text: "I'm thirteen. I know what people do when they don't want me to look." },
      ],
      choices: [
        { text: "Mia, wait on the other side of the wall. I'll handle it.", set: { harris: "quiet", juneTrust: "-1" }, log: "You sent Mia away and killed Dean where she could still hear it.", next: "black_quiet" },
        { text: "Tell her the truth. Then I'll make it quick.", set: { harris: "told", juneTrust: "+1" }, log: "You made Dean tell Mia he was bitten, then you ended it in front of her.", next: "black_told" },
        { text: "Back seat. Towel on the ankle. Tell me if it gets worse.", set: { harris: "delayed" }, log: "You let Dean keep the bite and got in the car.", next: "delay_leave" },
      ],
    },
    black_quiet: {
      kind: "black",
      arena: "dojo",
      text: "You send Mia to the other side of the wall.\nYou tell her not to come around.\nDean starts to say her name in a voice that isn't his.\nThe pipe stops him halfway through it.\nShe hears the voice change, and then she hears it stop.",
      next: "after_quiet",
    },
    black_told: {
      kind: "black",
      arena: "dojo",
      text: "Dean looks at Mia because you told him to.\nHe says he's sorry. Halfway through sorry, Mom's voice tries to finish the word.\nHe hears it. He looks sick with it.\nYou are quick.\nMia does not look away.",
      next: "after_told",
    },
    after_quiet: {
      kind: "talk",
      arena: "dojo",
      lines: [
        { speaker: "Mia", text: "I heard you stop. I didn't see it. Is that worse?" },
      ],
      choices: [
        { text: "Yes. You should have seen it. I won't hide the next one.", set: { juneTrust: "+1" }, log: "You told Mia that hiding Dean's death was worse.", next: "walk_gas" },
        { text: "Get in. It's done.", log: "You told Mia it was done and didn't explain.", next: "walk_gas" },
      ],
    },
    after_told: {
      kind: "talk",
      arena: "dojo",
      lines: [
        { speaker: "Mia", text: "He looked at me. You made him look at me." },
        { speaker: "Mia", text: "I'm not going to pretend I didn't see a person die." },
      ],
      choices: [
        { text: "Don't look away from it. That's the truth of this.", log: "You told Mia not to look away.", next: "walk_gas" },
        { text: "You don't have to carry that. I'll carry it.", set: { carried: true }, log: "You told Mia you would carry what happened to Dean.", next: "walk_gas" },
      ],
    },
    delay_leave: {
      kind: "talk",
      arena: "dojo",
      lines: [
        { speaker: "Dean", text: "Thank you. I'll say if it changes. I will." },
        { speaker: "Mia", text: "He didn't take the shoe off." },
        { text: "You drive with the pipe between the seats, where both of them can see it. The knife stays in your coat." },
      ],
      next: "car_dark",
    },
    secret_leave: {
      kind: "talk",
      arena: "dojo",
      lines: [
        { speaker: "Mia", text: "He keeps touching his leg." },
        { text: "You keep your eyes on the road. You do not tell her why." },
      ],
      next: "car_dark",
    },
    car_dark: {
      kind: "talk",
      arena: "dojo",
      log: "Dean repeated Mia's words in the car. His mouth was late, and the smile stayed.",
      lines: [
        { text: "You get a mile down the road before Dean speaks." },
        { speaker: "Dean", text: "Okay. Side door. I can be quiet.", when: { plan: "wait" } },
        { speaker: "Dean", text: "Mom might still be on the road.", when: { plan: "cut" } },
        { speaker: "Dean", text: "Mom said not to go with anyone else.", when: { plan: "harris" } },
        { speaker: "Mia", text: "Those are my words. From the center. Why is he saying them?" },
        { text: "His mouth is a little late for the sentence. When he finishes, the smile stays, like he forgot how to put it away." },
        { speaker: "Dean", text: "Sorry. It's the ankle. I'm still me. I swear I'm still me." },
      ],
      next: "walk_gas",
    },
    walk_gas: {
      kind: "explore",
      card: "The Station",
      kicker: "Day 3, night",
      arena: "gas",
      marker: "ellis",
      hint: "A man at the pumps is siphoning gas. He is alive.",
      spawn: [{ type: "shambler", count: 1, ambient: true }],
      next: "ellis_meet",
    },
    ellis_meet: {
      kind: "talk",
      arena: "gas",
      lines: [
        { speaker: "Rico", text: "Pumps are dead. I'm not. Name's Rico. I work here. Bathroom door's been opening by itself. Don't look in there." },
        { speaker: "Rico", text: "I had a full tank on day one. I gave three rides. The fourth person bit the driver. I'm not doing another ride unless I come with the car." },
        { speaker: "Mia", text: "He smells like the garage at school.", when: { juneTrust_gte: 0 } },
        { speaker: "Mia", text: "Don't let him in the car.", when: { juneTrust_lt: 0 } },
        { speaker: "Rico", text: "Kid's staring at that pipe. Somebody already used it.", when: { harris: "quiet" } },
        { speaker: "Dean", text: "I'm fine. Drive.", when: { harris: "secret" } },
        { speaker: "Dean", text: "If we can get to a pharmacy, I'll be fine.", when: { harris: "delayed" } },
        { speaker: "Rico", text: "Cooler's mine. Peaches and beans. I'm saying that before anybody gets brave." },
      ],
      choices: [
        { text: "You can see the pipe. Car fits all of us. You siphon, I drive.", set: { ellisWith: true, ellisTrust: "+1" }, log: "You let Rico into the car.", next: "fight_pump" },
        { text: "We're taking the cooler. You can keep the hose.", set: { robbed: true, ellisRaider: true, ellisTrust: "-2", food: "+1" }, log: "You took Rico's peaches and beans.", next: "fight_lot" },
        { text: "Leave him. Don't touch the cooler.", set: { ellisWith: false }, log: "You left Rico at the pumps.", next: "fight_pump" },
      ],
    },
    fight_pump: {
      kind: "combat",
      arena: "gas",
      spawn: [{ type: "shambler", count: 2 }],
      next: [
        { when: { ellisWith: true }, id: "after_join" },
        { id: "after_leave" },
      ],
    },
    after_join: {
      kind: "talk",
      arena: "gas",
      lines: [
        { speaker: "Rico", text: "You swing that pipe like you've done it before. I'll ride with that." },
        { speaker: "Mia", text: "He didn't run.", when: { juneTrust_lt: 0 } },
      ],
      next: AFTER_GAS,
    },
    after_leave: {
      kind: "talk",
      arena: "gas",
      lines: [
        { text: "Rico stays with the hose. He lifts a hand, not quite a wave, and the dark takes the pumps." },
      ],
      next: AFTER_GAS,
    },
    fight_lot: {
      kind: "combat",
      arena: "gas",
      spawn: [{ type: "shambler", count: 3 }, { type: "runner", count: 1 }],
      next: "after_lot",
    },
    after_lot: {
      kind: "talk",
      arena: "gas",
      lines: [
        { text: "Rico shouts that you robbed him until the dead answer. Then he runs." },
        { text: "He looks back once. The cooler is heavier than it was." },
      ],
      next: AFTER_GAS,
    },
    harris_check: {
      kind: "talk",
      arena: "gas",
      lines: [
        { speaker: "Mia", text: "Dean's been quiet since the tire shop. Quiet isn't better." },
        { speaker: "Dean", text: "I thought I could make it to a pharmacy. I didn't want her to see." },
        { text: "The towel on his ankle is the wrong color now. It's a bite. It is not getting better." },
      ],
      choices: [
        { text: "Mia, other side of the pumps. Don't watch.", set: { harris: "quiet", juneTrust: "-1" }, log: "You sent Mia away again and killed Dean at the pumps.", next: "black_late_quiet" },
        { text: "Show her the leg. Then I'll be quick.", set: { harris: "told" }, log: "You showed Mia the bite, then you ended it.", next: "black_late_told" },
        { text: "Not yet. We need the miles to the bridge.", log: "You left Dean's bite alone and kept driving.", next: "late_keep" },
      ],
    },
    black_late_quiet: {
      kind: "black",
      text: "The pumps tick as they cool.\nYou do it without a speech.\nMia hears it anyway.",
      next: "late_after",
    },
    black_late_told: {
      kind: "black",
      text: "He shows her the leg because there is nowhere left to hide it.\nShe nods. She already knew.\nYou are quick. You should have done this at the center.",
      next: "late_after",
    },
    late_after: {
      kind: "talk",
      arena: "gas",
      lines: [
        { speaker: "Mia", text: "Don't tell me you did it for me.", when: { harris: "quiet" } },
        { speaker: "Mia", text: "You waited until the towel decided.", when: { harris: "told" } },
      ],
      next: "bus_dark",
    },
    late_keep: {
      kind: "talk",
      arena: "gas",
      lines: [
        { speaker: "Mia", text: "If he turns in the back, I am not sitting up front like I didn't know." },
        { text: "You drive anyway." },
      ],
      next: "bus_dark",
    },
    bus_dark: {
      kind: "black",
      arena: "overpass",
      log: "A school bus on the shoulder was full of small hands. One of them mouthed your name. You did not open the door.",
      text: "A school bus sits on the shoulder. The lights are on. The door is shut.\nSmall hands press the glass from the inside.\nOne of them mouths your name, careful, like a lesson.\nYou do not open the door.\nAfter you pass, the bus rocks. All of them stood up at once.",
      next: [
        { when: { harris: "secret" }, id: "overpass_turn" },
        { when: { harris: "delayed" }, id: "overpass_turn" },
        { id: "overpass_calm" },
      ],
    },
    overpass_calm: {
      kind: "talk",
      card: "The Highway",
      kicker: "Day 3, later",
      arena: "overpass",
      lines: [
        { text: "A car sits half on the shoulder. The woman inside stops hitting the glass when she sees Mia. She smiles with too many teeth." },
        { text: "She says, in a little boy's voice, that Mom is at the bridge. Then her jaw slips, and the voice keeps going without the mouth." },
        { speaker: "Mia", text: "That was Leo's voice. She doesn't know Leo. Make it stop." },
        { speaker: "Rico", text: "Breaking that glass will be loud. Loud brings more of them.", when: { ellisWith: true } },
      ],
      choices: [
        { text: "Break the glass. End it before she gets out.", set: { stranger: "cut", calTrust: "+1" }, log: "You broke the car glass and killed the woman before she turned all the way.", next: "black_stranger" },
        { text: "Leave her. Noise brings more of them down on Mia.", set: { stranger: "left", calTrust: "-1" }, log: "You left a woman trapped in a car, already turning.", next: "left_stranger" },
      ],
    },
    black_stranger: {
      kind: "black",
      text: "The glass gives.\nShe tries to say thank you in Mom's voice and only gets halfway.\nWhat is left of her mouth keeps smiling.\nThe noise carries. More of them heard their cue.",
      next: "fight_noise",
    },
    fight_noise: {
      kind: "combat",
      arena: "overpass",
      spawn: [{ type: "shambler", count: 2 }],
      next: "truck",
    },
    left_stranger: {
      kind: "talk",
      arena: "overpass",
      lines: [
        { text: "You leave her in the car. She goes back to tapping, and between taps she practices Mia's name until she gets the shape of it right." },
      ],
      next: "truck",
    },
    overpass_turn: {
      kind: "talk",
      card: "The Highway",
      kicker: "Day 3, later",
      arena: "overpass",
      onEnter: { juneTrust: "-2" },
      log: "Dean turned in the back seat because you kept driving.",
      lines: [
        { text: "Dean sits up in the back seat. His mouth doesn't match the words." },
        { speaker: "Dean", text: "Mia. Side door. I can be quiet." },
        { text: "It is Mom's voice, warm and exact, coming out of what used to be Dean." },
        { speaker: "Mia", text: "I told you. I told you I wasn't going to sit here and not know." },
        { speaker: "Rico", text: "He's gone. Get out of the car.", when: { ellisWith: true } },
      ],
      next: "fight_turn",
    },
    fight_turn: {
      kind: "combat",
      arena: "overpass",
      onEnter: { harris: "turned" },
      spawn: [{ type: "runner", count: 1, name: "Dean" }, { type: "shambler", count: 2 }],
      next: "after_turn",
    },
    after_turn: {
      kind: "talk",
      arena: "overpass",
      lines: [
        { speaker: "Mia", text: "That was Dean. Say it. Don't skip his name." },
        { text: "The pipe is busy. Your hands are not cleaner for the work." },
      ],
      next: "truck",
    },
    truck: {
      kind: "talk",
      card: "The Van",
      kicker: "Day 3, late",
      arena: "truck",
      lines: [
        { speaker: "Nora", text: "I'm Nora. That's my brother Ben. He's bitten. He can still talk. I can't do it." },
        { speaker: "Ben", text: "Don't let me turn. Nora won't say it. I'm saying it. Do it while I still know her." },
        { text: "His fingers tap the van floor. He doesn't look at them. Outside, the dead tap the same beat back." },
        { speaker: "Ben", text: "They're learning the song. If I start singing it, don't wait for me to finish." },
        { speaker: "Sam", text: "I'm Sam. I was a paramedic. If he's still talking, he's still here. I'll stay either way." },
        { speaker: "Sam", text: "I passed a car back there. Somebody already did the hard thing. That was kinder than leaving her.", when: { stranger: "cut" } },
        { speaker: "Sam", text: "I passed a car where a woman was still beating on the glass. Someone walked past her.", when: { stranger: "left" } },
        { speaker: "Mia", text: "He sounds like Uncle Ray did on the phone. On day one. We hung up to save the battery." },
      ],
      choices: [
        { text: "I'll do it now, while he can still talk.", set: { brother: "cut", calTrust: "-1", water: true }, log: "You killed Ben while he could still talk.", next: "black_brother" },
        { text: "I'll wait with you. If he turns, I won't be late.", set: { brother: "wait", calTrust: "+1", waited: true, water: true }, log: "You waited with Ben until he turned.", next: "wait_brother" },
        { text: "Take our car. We'll walk. Get him away from the road.", set: { brother: "car", calTrust: "+1", ellisTrust: "-1", gaveCar: true, water: true }, log: "You gave Nora the car and walked.", next: "give_car" },
      ],
    },
    black_brother: {
      kind: "black",
      text: "Ben thanks you.\nFor half a second the thank-you is in Nora's voice, copied perfectly.\nHe hears himself do it. He nods, fast, so you won't hesitate.\nNora holds his hand until you tell her to hold his shoulder instead.\nYou are quick. The copied voice does not get a second try.",
      next: "after_brother",
    },
    after_brother: {
      kind: "talk",
      arena: "truck",
      lines: [
        { speaker: "Nora", text: "There's water in the blue jug. Take it. Don't look in the back of the van." },
        { speaker: "Sam", text: "You were fast. I don't know yet if that was mercy or a habit." },
        { speaker: "Rico", text: "Habit. You can hear it in the swing.", when: { ellisWith: true } },
      ],
      next: "cal_join",
    },
    wait_brother: {
      kind: "talk",
      arena: "truck",
      lines: [
        { speaker: "Ben", text: "Then stay where I can see the pipe. I don't want Nora to have to learn how." },
        { text: "He looks at Nora like he is memorizing how to be her brother. Then the look stays and the person leaves it. He turns with her name already in his mouth." },
      ],
      next: "fight_trees",
    },
    fight_trees: {
      kind: "combat",
      arena: "truck",
      spawn: [{ type: "runner", count: 1, name: "Ben" }, { type: "shambler", count: 4 }],
      next: "after_trees",
    },
    after_trees: {
      kind: "talk",
      arena: "truck",
      lines: [
        { speaker: "Nora", text: "He got what he asked for. It just wasn't quiet. Take the water. Go." },
        { speaker: "Sam", text: "You waited. That matters. It doesn't make it easier." },
      ],
      next: "cal_join",
    },
    give_car: {
      kind: "talk",
      arena: "truck",
      lines: [
        { speaker: "Nora", text: "I won't waste the gas. If he turns, I'll do it. You showed me I have to." },
        { speaker: "Rico", text: "We're walking because you gave the car away.", when: { ellisWith: true } },
        { speaker: "Mia", text: "My feet are fine. The bridge is still the plan.", when: { ellisWith: false } },
        { speaker: "Sam", text: "A car, given free. I'll remember that." },
      ],
      next: "cal_join",
    },
    cal_join: {
      kind: "talk",
      arena: "truck",
      lines: [
        { speaker: "Sam", text: "I'm going where there are still living people. That can be your road, or a different one." },
      ],
      choices: [
        { text: "Then keep up. Mia stays on my left.", set: { calWith: true }, log: "You let Sam walk with you.", next: "fight_road" },
        { text: "Find a different road. I mean it.", set: { calWith: false, calTrust: "-1" }, log: "You sent Sam away.", next: "fight_road" },
      ],
    },
    fight_road: {
      kind: "combat",
      card: "The Cut",
      kicker: "Day 3, late",
      arena: "cut",
      place: "The Cut",
      tip: "One of them stays low in the ditch. When it coils, it wants your legs.",
      spawn: (s) => {
        const extra = s.stranger === "cut" ? 1 : 0;
        const pack = s.gaveCar
          ? [{ type: "shambler", count: 4 + extra }, { type: "runner", count: 2 }]
          : [{ type: "shambler", count: 3 + extra }, { type: "runner", count: 1 }];
        pack.push({ type: "crawler", count: 1 });
        return pack;
      },
      next: "walk_school",
    },
    walk_school: {
      kind: "explore",
      card: "The School",
      kicker: "Day 4",
      arena: "school",
      marker: "door",
      hint: "Mia knows the side door. Mom might have left word here.",
      spawn: [{ type: "shambler", count: 2, ambient: true }],
      next: "school_door",
    },
    school_door: {
      kind: "talk",
      arena: "school",
      lines: [
        { speaker: "Mia", text: "This is the door I'm late through. The handle sticks. Pull up, then in." },
        { text: "Inside, something scrapes a locker from the wrong side. The metal bows out, like a shoulder that forgot it had bones." },
      ],
      next: "school_dark",
    },
    school_dark: {
      kind: "black",
      arena: "school",
      log: "The school speakers whispered that Leo is with Mom, in Mia's voice. Her mouth was shut.",
      text: "The PA clicks on. A morning bell. A teacher clearing her throat.\nThen a whisper, right against the speaker: Leo is with Mom.\nAcross the hall, Mia's mouth is shut.\nThe whisper uses her voice anyway.",
      next: "fight_gym",
    },
    fight_gym: {
      kind: "combat",
      arena: "school",
      tip: "The one with the open mouth calls the rest. Cut it while it is still only a mouth. A dodge slips the sound.",
      spawn: [{ type: "shambler", count: 3 }, { type: "screamer", count: 1 }],
      next: "school_paper",
    },
    school_paper: {
      kind: "talk",
      arena: "school",
      lines: [
        { text: "A note on the trophy case, in a teacher's fast hand: LEO IS WITH MOM. ARMY BRIDGE. IF MIA COMES HERE, TELL HER WE DID NOT LEAVE HER." },
        { text: "The same words are scratched into the glass from the inside. The scratches are older than the paper. The building knew before the teacher did." },
        { text: "Mia is thirteen. Leo is eight. The note has been waiting since yesterday. The scratches have been waiting longer." },
      ],
      choices: [
        { text: "Ask her where Leo is before you show her the note.", set: { asked: true, toldThomas: true, juneTrust: "+1" }, log: "You asked Mia about Leo before you showed her the note.", next: "after_paper" },
        { text: "Put the note in her hand. No speech.", set: { toldThomas: true }, log: "You handed Mia the note about Leo and Mom.", next: "after_paper" },
        { text: "Fold the note into your coat. Don't show her yet.", set: { hidThomas: true }, log: "You hid the note about Leo and Mom.", next: "after_paper" },
      ],
    },
    after_paper: {
      kind: "talk",
      arena: "school",
      lines: [
        { speaker: "Mia", text: "He's eight. He sleeps with one shoe on. I don't know why that's the part I say. Mom has him. They're going to the bridge.", when: { asked: true } },
        { speaker: "Mia", text: "You let me say it before the note did. Thank you.", when: { asked: true } },
        { speaker: "Mia", text: "The bridge. If you're about to tell me not to hope, don't. That's the plan.", when: { toldThomas: true, asked: false } },
        { text: "The note stays in your coat. Mia still thinks you are only guessing.", when: { hidThomas: true } },
        { speaker: "Rico", text: "The bridge is east. If we live long enough to get lost, that's the direction.", when: { ellisWith: true, toldThomas: true } },
        { speaker: "Sam", text: "A note that names a place is better than a rumor. The bridge, then.", when: { calWith: true, toldThomas: true } },
      ],
      next: "sword_case",
    },
    sword_case: {
      kind: "talk",
      arena: "school",
      place: "The School",
      lines: [
        { text: "Under the note, the trophy case is cracked. On the felt, the kendo sword from Saturday class is waiting." },
        { text: "The tag is in your handwriting. Return to {name}. A care card is taped behind it: sharpen the edge on a stone, warm the spine over a low flame so it doesn't crack, don't grind the groove." },
        { speaker: "Mia", text: "That's the one from Saturday. You let us look. You never let us touch it." },
        { text: "Three days of pipe and knife. This will cut cleaner, once you take it." },
      ],
      choices: [
        { text: "Tell her you left it here for class. Then take it.", set: { swordRank: 1, weapon: "sword", swordTold: true, juneTrust: "+1" }, log: "You took the school sword and told Mia why it was here.", next: "walk_farm" },
        { text: "Take it. You can explain on the way to the farm.", set: { swordRank: 1, weapon: "sword", swordTold: false }, log: "You took the school sword and didn't explain it.", next: "walk_farm" },
      ],
    },
    walk_farm: {
      kind: "explore",
      card: "Walsh Farm",
      kicker: "Day 4, afternoon",
      arena: "farm",
      marker: "gate",
      hint: "Last roof before the bridge. A man at the gate already has a rifle.",
      spawn: [{ type: "shambler", count: 1, ambient: true }],
      next: "farm_gate",
    },
    farm_gate: {
      kind: "talk",
      arena: "farm",
      lines: [
        { speaker: "Dale", text: "Sword in the dirt before you talk. I'm Dale Walsh. My mother Helen is in the house. She's sick. She still knows everybody's name." },
        { speaker: "Dale", text: "A kid at the pumps said a person from town killed a bitten man where a girl could hear it. That you?", when: { harris: "quiet" } },
        { speaker: "Dale", text: "A mechanic came through angry. Said someone took his food with a pipe. If that was you, say it now.", when: { robbed: true } },
        { speaker: "Mia", text: "You had a note about Leo and you hid it.", when: { hidThomas: true } },
        { speaker: "Mia", text: "This place has a fence. Don't promise me it means we're safe.", when: { juneTrust_gte: 1 } },
      ],
      choices: [
        { text: "The sword goes in the dirt. Ask Helen what she needs.", log: "You put the sword down at Walsh Farm.", next: "ruth_talk" },
        { text: "I'll hold it. If something comes up the lane, the dirt is a bad place for it.", log: "You would not put the sword down for Dale.", next: "ruth_talk" },
      ],
    },
    ruth_talk: {
      kind: "talk",
      arena: "farm",
      lines: [
        { speaker: "Helen", text: "I don't need a speech. I need a decision. There is one bottle of real antibiotics. The date is old. It's all we have." },
        { speaker: "Helen", text: "I'm sick from a dirty cut. Not a bite. And Jonah from next door is in the side room. He's eight. Fever. Nobody saw a bite. Nobody looked hard enough to swear." },
        { speaker: "Dale", text: "You pick wrong, you say it at breakfast. We don't hide it." },
      ],
      next: "sam_truth",
    },
    sam_truth: {
      kind: "talk",
      arena: "farm",
      lines: [
        { speaker: "Mia", text: "Jonah sits behind Leo at assembly. He cried at the fire drill. That's all I know. Don't talk about him like he's a number." },
        { text: "You stand in the doorway. Jonah's eyes are open. His sleeve is damp where somebody already checked, or pretended to." },
        { speaker: "Jonah", text: "Don't go to the bridge. She's already waiting there." },
        { text: "He says it in a clear voice, looking at you, a person he has never met. Then he blinks, asks for water, and does not remember saying anything." },
        { speaker: "Mia", text: "He doesn't know you. He doesn't know the bridge. How does he know?" },
      ],
      choices: [
        { text: "That's a bite until morning proves it isn't. I'm saying it out loud.", set: { saidFever: "bite", juneTrust: "+1" }, log: "You called Jonah's fever a bite, out loud.", next: "meds" },
        { text: "It could be a normal fever. I'm not burying a guess.", set: { saidFever: "cold" }, log: "You called Jonah's fever a normal sickness.", next: "meds" },
      ],
    },
    meds: {
      kind: "talk",
      arena: "farm",
      lines: [
        { speaker: "Helen", text: "One bottle. If you split it, you waste it. I've done the math. I hate the math." },
        { speaker: "Mia", text: "You already said what you think he is.", when: { saidFever: "bite" } },
        { speaker: "Mia", text: "You said it was a fever. Say it again if you're about to give the medicine to someone else.", when: { saidFever: "cold" } },
      ],
      choices: [
        { text: "Helen gets it. The farm falls apart if the person who knows everyone dies.", set: { meds: "ruth", samAlive: false, ruthAlive: true, peteAlive: true }, log: "You gave the antibiotics to Helen.", next: "after_meds", when: { saidFever: "bite" } },
        { text: "Helen gets it. You called Jonah a fever so this would be easier.", set: { meds: "ruth", samAlive: false, ruthAlive: true, peteAlive: true, juneTrust: "-1" }, log: "You called a bite a fever, then gave the medicine to Helen.", next: "after_meds", when: { saidFever: "cold" } },
        { text: "Jonah gets it. He's eight, and he's scared.", set: { meds: "sam", samAlive: true, ruthAlive: false, peteAlive: false, juneTrust: "+1" }, log: "You gave the antibiotics to Jonah.", next: "after_meds" },
        { text: "The bottle stays in my coat. I don't know enough.", set: { meds: "kept", samAlive: false, ruthAlive: false, peteAlive: false, juneTrust: "-1" }, log: "You kept the medicine.", next: "after_meds" },
      ],
    },
    after_meds: {
      kind: "talk",
      arena: "farm",
      lines: [
        { speaker: "Dale", text: "Then we hold the fence. Mom's still giving orders.", when: { ruthAlive: true } },
        { speaker: "Dale", text: "All right. Then I'm in charge. I won't thank you for picking the boy. I'll run the watch.", when: { meds: "sam" } },
        { speaker: "Dale", text: "I can hear that bottle when you move. You kept it. If tonight takes this place, you remember that.", when: { meds: "kept" } },
        { speaker: "Ray", text: "Left side's mine. You take the gate.", when: { peteAlive: true } },
        { text: "The fields go dark. Something at the tree line has decided the fence is only a fence.", when: { peteAlive: false } },
      ],
      next: "night_talk",
    },
    night_talk: {
      kind: "talk",
      card: "The Fence",
      kicker: "Day 4, night",
      arena: "treeline",
      place: "The Tree Line",
      lines: [
        { speaker: "Mia", text: "If I go left, tell me where you're swinging. I don't want the sword in my way." },
        { speaker: "Rico", text: "I'll take the loud side. Kid stays where she can see a person who isn't swinging.", when: { ellisWith: true } },
        { speaker: "Sam", text: "I'll stay low and pull anyone who goes down. That's the job.", when: { calWith: true } },
        { text: "Dale sends you past the gate. The house stays behind you. Out here it's corn, a shed that already fell, and the trees." },
      ],
      next: "corn_dark",
    },
    corn_dark: {
      kind: "black",
      arena: "treeline",
      log: "The corn said your name, then Mia's, then Mom's. The last one was perfect.",
      text: "Past the gate, the corn says your name.\nThen it says Mia's.\nThen it says Mom's, and that one is perfect. The way she said it when she was only calling you in for dinner.\nNothing walks out. The field just knows who to call.\nThen the tree line answers, and it is not a voice anymore.",
      next: "fight_fence",
    },
    fight_fence: {
      kind: "combat",
      arena: "treeline",
      place: "The Tree Line",
      tip: "The swollen one comes apart. Give the body room when it does.",
      spawn: (s) => [
        { type: "shambler", count: s.ruthAlive ? 5 : 8 },
        { type: "runner", count: s.ruthAlive ? 1 : 2 },
        { type: "bloater", count: 1 },
      ],
      next: "morning",
    },
    morning: {
      kind: "talk",
      card: "Morning",
      kicker: "Day 5",
      arena: "well",
      place: "The Well",
      lines: [
        { text: "The quiet hour is at the well, behind the house. The porch lamp is still warm. Then the trucks on the county road will spend the rest of the day." },
        { speaker: "Helen", text: "Jonah didn't see this light. The fever broke into a bite near dawn. You don't have to say you knew.", when: { meds: "ruth" } },
        { speaker: "Dale", text: "Jonah ate breakfast. Mom didn't. That's the report. I won't dress it up.", when: { meds: "sam" } },
        { speaker: "Dale", text: "Both of them are gone. And the bottle still clicks when you breathe. Be off my porch when the hour's done.", when: { meds: "kept" } },
        { speaker: "Ray", text: "Gate held. Don't put your name on that.", when: { peteAlive: true } },
        { speaker: "Mia", text: "If you're going to sit, sit. If you're going to sharpen that sword, do it where I don't have to watch.", when: { juneTrust_gte: 0 } },
        { speaker: "Mia", text: "Don't spend the hour on me. I'm still here. That's enough.", when: { juneTrust_lt: 0 } },
      ],
      choices: [
        { text: "Sit with Mia and don't fill the quiet. You said you would carry what happened to Dean.", set: { carriedPaid: true, juneTrust: "+1", hour: "june" }, log: "You spent the quiet hour with Mia, the way you said you would.", next: "after_morning", when: { carried: true } },
        { text: "Walk the fence with Mia. Leave the sword in the dirt.", set: { juneTrust: "+1", swordDown: true, hour: "fence" }, log: "You left the sword in the dirt and walked the fence with Mia.", next: "after_morning", when: { juneTrust_gte: 0 } },
        { text: "Give Mia the last of the peaches.", set: { food: "-1", juneTrust: "+1", hour: "food" }, log: "You gave Mia the last can of peaches.", next: "after_morning", when: { food_gte: 1 } },
        { text: "Sharpen the sword the way the care card said. Don't grind the groove.", set: { sharpened: true, bladeWear: 0, hour: "sharpen", swordRank: 2, weapon: "sword" }, log: "You spent the quiet hour sharpening the sword.", next: "after_morning" },
      ],
    },
    after_morning: {
      kind: "talk",
      arena: "well",
      lines: [
        { speaker: "Mia", text: "Okay. That's enough. Bridge is still the plan.", when: { hour: "june" } },
        { text: "The sword looks smaller in the dirt. You pick it up when the engines start. Dirt does not keep a weapon.", when: { hour: "fence" } },
        { speaker: "Mia", text: "They taste like a normal morning. Don't ruin it by asking if I'm grateful.", when: { hour: "food" } },
        { text: "The edge comes back clean. The groove is the same. You left it alone, like the card said.", when: { hour: "sharpen" } },
        { speaker: "Dale", text: "Trucks. Two of them. They stopped where the corn can hear them. They're between us and the bridge." },
      ],
      next: [
        { when: { hour: "sharpen" }, id: "temper" },
        { id: "walk_voss" },
      ],
    },
    temper: {
      kind: "talk",
      arena: "well",
      onEnter: { swordRank: 3, weapon: "sword" },
      log: "You warmed the spine of the sword over the porch lamp, the way the care card said.",
      lines: [
        { text: "The care card had a second step. You hold the spine over the porch lamp until the steel takes a low heat. You do not let the stone touch the groove." },
        { text: "It won't crack on the next hard swing. This is the sword you left at the school, just looked after." },
        { speaker: "Mia", text: "It looks like Saturday class again. Don't ask me to be proud of a weapon.", when: { swordTold: true } },
        { speaker: "Mia", text: "You still haven't said why it was at school.", when: { swordTold: false } },
        { speaker: "Rico", text: "That's a long way from a pipe. I'll still take the loud side.", when: { ellisWith: true } },
      ],
      next: "walk_voss",
    },
    walk_voss: {
      kind: "explore",
      card: "The Block",
      kicker: "Day 5",
      arena: "roadblock",
      marker: "voss",
      hint: "Kane wants half the farm's food. His trucks are blocking the road to the bridge.",
      spawn: [{ type: "shambler", count: 1, ambient: true }],
      next: "voss_talk",
    },
    voss_talk: {
      kind: "talk",
      arena: "roadblock",
      lines: [
        { speaker: "Kane", text: "Half the food. You keep the people, the well, and the road to the bridge. I keep my trucks from burning the farm." },
        { speaker: "Kane", text: "Kane. That's the whole name. Don't look for a softer one." },
        { speaker: "Rico", text: "You took my cooler. Kane took me in. Get off the high horse.", when: { ellisRaider: true } },
        { speaker: "Mia", text: "Don't trade a person. Food is food. I'm not food.", when: { juneAlive: true, juneTrust_gte: 0 } },
        { speaker: "Sam", text: "Food isn't a child. It also isn't nothing. Choose like you'll have to eat the result.", when: { calWith: true } },
      ],
      choices: [
        { text: "Rico. Taking the cooler was wrong. Come back with us.", set: { ellisRaider: false, ellisWith: true, ellisAlive: true, ellisTrust: 0, ellisExit: "" }, log: "You asked Rico to come back, and he did.", next: "ellis_down", when: { ellisRaider: true } },
        { text: "Half the food. Take your trucks, and Rico if he still wants them.", set: { voss: "parley", sparedVoss: true, ellisRaider: false, ellisExit: "voss", ellisWith: false, calTrust: "+1" }, log: "You gave Kane half the food. Rico left with the trucks.", next: "after_parley", when: { ellisRaider: true } },
        { text: "Half the food. You leave the people, and you clear the road to the bridge.", set: { voss: "parley", sparedVoss: true, calTrust: "+1" }, log: "You gave Kane half the food.", next: "after_parley", when: { ellisRaider: false } },
        { text: "No. The food stays. So do we.", set: { voss: "fight" }, log: "You refused Kane.", next: "fight_raiders" },
        { text: "Just you and me. Your people stay back.", set: { voss: "duel" }, log: "You offered Kane a one-on-one fight.", next: "fight_duel" },
        { text: "Take Mia, and leave the farm alone.", set: { juneAlive: false, voss: "trade", calWith: false, calTrust: "-2", juneTrust: "-5" }, log: "You offered Mia to Kane to spare the farm.", next: "trade_june", when: { juneTrust_lt: 0, juneAlive: true } },
      ],
    },
    ellis_down: {
      kind: "talk",
      arena: "roadblock",
      lines: [
        { speaker: "Rico", text: "I'm not your friend. I'm here so the kid has somebody who isn't you. Don't dress it up." },
        { speaker: "Kane", text: "Fine. The mechanic's soft. I'm not. Half the food, or I start with the porch." },
      ],
      next: "voss_deal",
    },
    voss_deal: {
      kind: "talk",
      arena: "roadblock",
      lines: [
        { speaker: "Mia", text: "He's still a man with trucks and guns.", when: { juneAlive: true } },
      ],
      choices: [
        { text: "Half the food. You leave the people, and you clear the road.", set: { voss: "parley", sparedVoss: true, calTrust: "+1" }, log: "You gave Kane half the food.", next: "after_parley" },
        { text: "No. The food stays.", set: { voss: "fight" }, log: "You refused Kane.", next: "fight_raiders" },
        { text: "Just you and me. Your people stay back.", set: { voss: "duel" }, log: "You offered Kane a one-on-one fight.", next: "fight_duel" },
        { text: "Take Mia, and leave the farm alone.", set: { juneAlive: false, voss: "trade", calWith: false, calTrust: "-2", juneTrust: "-5" }, log: "You offered Mia to Kane to spare the farm.", next: "trade_june", when: { juneTrust_lt: 0, juneAlive: true } },
      ],
    },
    after_parley: {
      kind: "talk",
      arena: "roadblock",
      lines: [
        { speaker: "Kane", text: "Food in the truck beds. The gate stays up. The road to the bridge is open. If I see that sword pointed at my people, I won't talk next time." },
        { speaker: "Dale", text: "We'll eat less. We'll eat. I can hate the deal and still count the sacks." },
        { speaker: "Rico", text: "Don't wait up.", when: { ellisExit: "voss" } },
        { speaker: "Sam", text: "You bought a morning. Mornings aren't free. They're still mornings.", when: { calWith: true } },
      ],
      next: "river",
    },
    fight_raiders: {
      kind: "combat",
      arena: "roadblock",
      tip: "Living people shoot. The shot is slow if you move. Get close and they switch to a knife.",
      spawn: (s) => {
        const list = [
          { type: "raider", count: 2 },
          { type: "raider", count: 1, name: "Kane", id: "voss", hp: 100 },
        ];
        if (s.ellisRaider) list.push({ type: "raider", count: 1, name: "Rico", id: "ellis", hp: 64 });
        return list;
      },
      next: "after_raiders",
    },
    after_raiders: {
      kind: "talk",
      arena: "roadblock",
      lines: [
        { text: "The trucks tick as they cool. The road to the bridge is open. Nobody is going to call this a win out loud." },
        { speaker: "Dale", text: "The food stays. So do the bodies." },
        { speaker: "Mia", text: "Rico ran the wrong way, and then he stopped.", when: { ellisExit: "dead" } },
        { speaker: "Rico", text: "I kept her behind the truck. That's the whole sentence.", when: { ellisWith: true, ellisAlive: true } },
        { speaker: "Sam", text: "I'll bury the ones who still have faces. I won't ask you to help.", when: { calWith: true } },
      ],
      next: "river",
    },
    fight_duel: {
      kind: "combat",
      arena: "roadblock",
      spawn: [{ type: "raider", count: 1, name: "Kane", id: "voss", hp: 120 }],
      next: [
        { when: { ellisRaider: true }, id: "after_duel_ellis" },
        { id: "after_duel" },
      ],
    },
    after_duel: {
      kind: "talk",
      arena: "roadblock",
      lines: [
        { text: "Kane drops. He was alive a second ago. The sword knows the difference, and so do you." },
        { speaker: "Dale", text: "One body. The food stays. The road is open. I don't know if that's the trade you think it is." },
        { speaker: "Mia", text: "You didn't have to make it a show.", when: { juneAlive: true } },
      ],
      next: "river",
    },
    after_duel_ellis: {
      kind: "talk",
      arena: "roadblock",
      onEnter: { ellisRaider: false, ellisExit: "fled", ellisWith: false },
      log: "Rico saw Kane fall and took the road.",
      lines: [
        { speaker: "Rico", text: "I'm not next. Remember you made a show of it." },
        { text: "He takes the road. He doesn't take a truck." },
      ],
      next: "river",
    },
    trade_june: {
      kind: "talk",
      arena: "roadblock",
      lines: [
        { speaker: "Kane", text: "I don't steal kids. I take what a place puts on the table. Remember who set it." },
        { speaker: "Dale", text: "Get that sword off my farm. The food can stay. I will not say her name for you." },
        { speaker: "Sam", text: "I won't walk with you after that." },
      ],
      next: "after_trade",
    },
    after_trade: {
      kind: "talk",
      arena: "roadblock",
      lines: [
        { text: "The trucks leave with Mia. Your left side is empty." },
        { text: "Nobody loads a gun. They don't have to. The road to the bridge is open, and she isn't on it." },
      ],
      next: "river",
    },
    river: {
      kind: "talk",
      arena: "farm",
      place: "Walsh gate",
      lines: [
        { text: "You decide at the gate, because every road is visible from it. The army bridge is one of them. Mom and Leo were going there." },
        { speaker: "Mia", text: "The bridge. I'm not asking you to promise Leo is alive. I'm asking you not to make me go alone.", when: { juneAlive: true, toldThomas: true, juneTrust_gte: 0, hidThomas: false } },
        { speaker: "Mia", text: "I know the way to the bridge. I'm not walking it with you.", when: { juneAlive: true, juneTrust_lt: 0, toldThomas: true } },
        { speaker: "Mia", text: "You never told me what the note said. I found it anyway. I'm still not sure about you.", when: { juneAlive: true, hidThomas: true, juneTrust_gte: 0 } },
        { speaker: "Sam", text: "There's a radio signal past the bridge. A voice that still says street names. I want to hear which streets.", when: { calWith: true, calTrust_gte: 1 } },
        { speaker: "Sam", text: "I heard a signal. I'm not taking you to it.", when: { calWith: true, calTrust_lt: 1 } },
        { speaker: "Rico", text: "Signals don't feed you. The gate does. Ugly, but it eats.", when: { ellisWith: true } },
        { speaker: "Dale", text: "If you stay, you take a watch like a person, not a weapon that sleeps in the yard.", when: { ruthAlive: true } },
        { speaker: "Dale", text: "Stay if you're staying to bury the morning. Don't stay to be thanked.", when: { ruthAlive: false } },
        { text: "The bridge is still there. Mia is not.", when: { juneAlive: false } },
      ],
      choices: [
        { text: "Stay. Sword by the door. Take a watch.", set: { road: "stay" }, log: "You chose to stay at Walsh Farm.", next: "walk_bridge", when: { ruthAlive: true } },
        { text: "Stay anyway. Someone has to bury the morning.", set: { road: "stay" }, log: "You stayed at a farm that already broke.", next: "walk_bridge", when: { ruthAlive: false } },
        { text: "Take Mia to the bridge and look for Mom and Leo.", set: { road: "brother" }, log: "You chose the bridge, with Mia, to look for Mom and Leo.", next: "walk_bridge", when: { juneAlive: true, juneTrust_gte: 0, toldThomas: true } },
        { text: "Go with Sam toward the radio signal.", set: { road: "signal" }, log: "You chose Sam's radio signal past the bridge.", next: "walk_bridge", when: { calWith: true, calTrust_gte: 1 } },
        { text: "Leave alone, before anyone can follow.", set: { road: "alone" }, log: "You left alone.", next: "walk_bridge" },
      ],
    },
    walk_bridge: {
      kind: "explore",
      card: "The Bridge",
      kicker: "Day 5, evening",
      arena: "bridge",
      marker: "span",
      hint: "The bridge is the army checkpoint. The dead are already on it.",
      spawn: [{ type: "shambler", count: 2, ambient: true }],
      next: "pre_bridge",
    },
    pre_bridge: {
      kind: "talk",
      arena: "bridge",
      lines: [
        { text: "They heard the sword, or they heard the living. The span is full of them either way." },
        { speaker: "Mia", text: "Left side. Like the first time. Don't miss.", when: { juneAlive: true, juneTrust_gte: 1 } },
        { speaker: "Mia", text: "I'll be behind you. Not close.", when: { juneAlive: true, juneTrust_lt: 1 } },
        { speaker: "Rico", text: "Edge looks honest. Try to be.", when: { ellisWith: true, sharpened: true } },
        { speaker: "Rico", text: "That edge catches. Don't saw on my account.", when: { ellisWith: true, sharpened: false } },
        { speaker: "Sam", text: "If I fall, don't make a speech. Make it quick.", when: { calWith: true } },
        { text: "Kane's rifle drops one of them on the span. He doesn't look at you. A deal is a deal.", when: { voss: "parley" } },
      ],
      next: "empty_post",
    },
    empty_post: {
      kind: "talk",
      arena: "bridge",
      log: "The army tents were empty. A loudspeaker used Mom's voice, then laughed with no air in it.",
      lines: [
        { text: "The army tents are up. The cots are made. Coffee is burned to the bottom of a pot. Nobody is here to drink it." },
        { text: "A loudspeaker loops the same line. Proceed to the checkpoint. It is Mom's voice. On the third loop it says Mia's name, and then it laughs with no air in it." },
        { speaker: "Mia", text: "That's her. That's not her. Don't make me pick.", when: { juneAlive: true } },
        { speaker: "Sam", text: "A recording can be copied. A laugh like that isn't a recording.", when: { calWith: true } },
        { speaker: "Rico", text: "Then we don't stand here and listen to the rest of the song.", when: { ellisWith: true } },
      ],
      next: "fight_bridge",
    },
    fight_bridge: {
      kind: "combat",
      arena: "bridge",
      tip: "One of them is only standing. It starts moving when you get close.",
      spawn: (s) => {
        const shambler = 6 + (s.ruthAlive ? 0 : 2) + (s.stranger === "cut" ? 1 : 0);
        const runner = s.voss === "parley" ? 1 : 2;
        return [
          { type: "shambler", count: shambler },
          { type: "runner", count: runner },
          { type: "brute", count: 1 },
          { type: "stalker", count: 1 },
        ];
      },
      next: "ending",
    },
    ending: { kind: "ending", arena: "bridge" },
  };

  const DAY_FOUR = {
    walk_school: 1, school_door: 1, school_dark: 1, fight_gym: 1, school_paper: 1, after_paper: 1, sword_case: 1,
    walk_farm: 1, farm_gate: 1, ruth_talk: 1, sam_truth: 1, meds: 1, after_meds: 1,
    night_talk: 1, corn_dark: 1, fight_fence: 1,
  };
  const DAY_FIVE = {
    morning: 1, after_morning: 1, temper: 1, walk_voss: 1, voss_talk: 1, ellis_down: 1, voss_deal: 1,
    after_parley: 1, fight_raiders: 1, after_raiders: 1, fight_duel: 1, after_duel: 1,
    after_duel_ellis: 1, trade_june: 1, after_trade: 1, river: 1, walk_bridge: 1,
    pre_bridge: 1, empty_post: 1, fight_bridge: 1, ending: 1,
  };

  function dayOf(id) {
    if (DAY_FIVE[id]) return 5;
    if (DAY_FOUR[id]) return 4;
    return 3;
  }

  function withYou(s, id) {
    if (id === "june") return !!s.juneAlive;
    if (id === "ellis") return !!(s.ellisWith && s.ellisAlive);
    if (id === "cal") return !!s.calWith;
    return false;
  }

  const WHO = { june: "Mia", ellis: "Rico", cal: "Sam" };

  function lineFor(s, id, why) {
    const place = s.lastFall || s.place || "the road";
    if (id === "june") {
      if (why.down && why.fall) return "You fell at " + place + ". So did I. I can walk. I won't fight again until tomorrow.";
      if (why.down) return "I went down at " + place + ". I can walk. I won't fight again until tomorrow.";
      if ((s.juneTrust || 0) < 0) return "You fell at " + place + ". I saw it from where you left me.";
      return "You went down at " + place + ". I stayed on the left.";
    }
    if (id === "ellis") {
      if (why.down && why.fall) return "You fell at " + place + ". I did too. The wrench stays down until tomorrow.";
      if (why.down) return "The wrench is done for today. I'll walk. I won't swing until tomorrow.";
      return "You hit the ground at " + place + ". I heard it.";
    }
    if (why.down && why.fall && why.pull) return "You fell at " + place + ". I pulled one of them off you, and then I went down. I can't do either again until tomorrow.";
    if (why.down && why.fall) return "You fell at " + place + ". I went down in the same fight. I can't pull another one off you until tomorrow.";
    if (why.down && why.pull) return "I pulled one of them off you and then I went down. I can't do that again until tomorrow.";
    if (why.down) return "I can't stand in another fight until tomorrow.";
    if (why.fall && why.pull) return "You fell at " + place + ". Before that I pulled one of them off you.";
    if (why.pull) return "I pulled one of them off you. Don't thank me. It was the job.";
    return "You fell at " + place + ". I saw it.";
  }

  function writePending(s, id) {
    if (!withYou(s, id)) return;
    const down = (s[id + "Down"] || 0) === (s.day || 3) && s[id + "DownTold"] !== (s.day || 3);
    const fall = !!s.mentionFall;
    const pull = id === "cal" && !!s.mentionPull;
    if (!down && !fall && !pull) {
      if (s.pending) delete s.pending[id];
      return;
    }
    if (!s.pending) s.pending = {};
    s.pending[id] = {
      speaker: WHO[id],
      text: lineFor(s, id, { down, fall, pull }),
      fall, pull, down,
    };
  }

  function remember(s, kind, who) {
    if (!s.pending) s.pending = {};
    if (kind === "fall") {
      const place = s.place || "the road";
      s.falls = (s.falls || 0) + 1;
      s.lastFall = place;
      s.mentionFall = true;
      s.bladeWear = Math.min(0.62, (s.bladeWear || 0) + 0.1);
      s._wear = s.bladeWear;
      s.journal.push(s.falls > 1
        ? "You fell again at " + place + ". You stood back up. The weapon kept another nick."
        : "You fell at " + place + ". You stood back up. The weapon kept a nick.");
      ["june", "ellis", "cal"].forEach((id) => writePending(s, id));
      return;
    }
    if (kind === "down" && who) {
      s[who + "Down"] = s.day || 3;
      s.journal.push(WHO[who] + " went down at " + (s.place || "the road") + ". No fight until tomorrow.");
      writePending(s, who);
      return;
    }
    if (kind === "pull") {
      s.mentionPull = true;
      s.journal.push("Sam pulled a body off you.");
      writePending(s, "cal");
    }
  }

  function readyLines(s) {
    const pending = s.pending || {};
    return ["june", "ellis", "cal"].filter((id) => pending[id]).map((id) => ({
      speaker: pending[id].speaker,
      text: pending[id].text,
      hear: id,
    }));
  }

  function hear(s, id) {
    const pending = s.pending || {};
    const line = pending[id];
    if (!line) return;
    if (line.down) s[id + "DownTold"] = s.day || 3;
    delete pending[id];
    if (line.fall && !Object.values(pending).some((item) => item.fall)) s.mentionFall = false;
    if (line.pull) s.mentionPull = false;
  }

  function onEnter(id, s) {
    const nextDay = dayOf(id);
    const prev = s.day || 3;
    if (nextDay > prev) {
      if (s.juneAlive && s.juneDown === prev) s.journal.push("Morning. Mia can fight again.");
      if (s.ellisWith && s.ellisAlive && s.ellisDown === prev) s.journal.push("Morning. Rico will swing the wrench again.");
      if (s.calWith && s.calDown === prev) s.journal.push("Morning. Sam can stand in a fight again.");
    }
    s.day = nextDay;
    if (nextDay > prev) ["june", "ellis", "cal"].forEach((who) => writePending(s, who));
    if (!s._did) s._did = {};
    if (s._did[id]) return;
    s._did[id] = true;
    const node = NODES[id];
    if (node && node.onEnter) apply(node.onEnter, s);
    if (node && node.log) s.journal.push(fill(node.log, s));
    if (id === "farm_gate" && s.hidThomas && !s._hidPaid) {
      s._hidPaid = true;
      s.toldThomas = true;
      s.juneTrust -= 1;
      s.journal.push("Mia found the note in your coat. Mom has Leo. They were going to the bridge.");
    }
    if (id === "morning" && s.ellisWith && s.ellisAlive && s.juneTrust < 1 && !s._ellisSoften) {
      s._ellisSoften = true;
      s.juneTrust += 1;
      s.journal.push("Mia saw Rico hold the line. She trusts the road a little more.");
    }
  }

  function band(n) {
    if (n >= 2) return "with you";
    if (n >= 1) return "trusts you";
    if (n >= 0) return "here";
    if (n >= -1) return "angry";
    return "done with you";
  }

  function relations(s) {
    const goal = !s.juneAlive
      ? "Mia is gone. The bridge is still out there."
      : s.toldThomas
        ? "Goal: the army bridge. Mom has Leo. Mia knows."
        : "Goal: the army bridge. Mom has Leo. Mia is with you.";
    let mia = !s.juneAlive
      ? "Mia is gone."
      : "Mia is " + band(s.juneTrust) + ".";
    if (s.juneAlive && s.juneDown === s.day) mia += " She will not fight again until tomorrow.";
    let rico = "Rico is not with you.";
    if (s.ellisExit === "dead") rico = "Rico died at the roadblock.";
    else if (s.ellisExit === "voss") rico = "Rico left with Kane's trucks.";
    else if (s.ellisExit === "fled") rico = "Rico saw the duel and left.";
    else if (s.ellisWith && s.ellisAlive) {
      rico = "Rico is " + band(s.ellisTrust) + ".";
      if (s.ellisDown === s.day) rico += " The wrench is down until tomorrow.";
    }
    else if (s.robbed) rico = "You took his food. He remembers.";
    let sam = !s.calWith ? "Sam is on some other road." : "Sam is " + band(s.calTrust) + ".";
    if (s.calWith && s.calDown === s.day) sam += " He will not fight again until tomorrow.";
    const wear = s.bladeWear || 0;
    const honest = s.sharpened || wear < 0.08
      ? "The edge is clean."
      : wear < 0.3
        ? "The blade still cuts, mostly."
        : "The edge catches. You have to swing twice.";
    let edge = "You have a pipe and a short knife. The school sword is still at the school.";
    if ((s.swordRank || 0) >= 3) edge = "You sharpened the sword and warmed the spine. " + honest;
    else if ((s.swordRank || 0) >= 2) edge = "You sharpened the sword. " + honest;
    else if ((s.swordRank || 0) >= 1) edge = "You have the school sword. It still needs a stone. " + honest;
    if ((s.swordRank || 0) > 0 && s.weapon && s.weapon !== "sword") {
      edge += s.weapon === "knife"
        ? " The knife is in your hand."
        : " The pipe is in your hand.";
    }
    return [goal, mia, rico, sam, edge];
  }

  function endingOf(s) {
    if (!s.juneAlive) return "trade";
    if (s.road === "brother") return "june";
    if (s.road === "signal") return "signal";
    if (s.road === "alone") return "ash";
    if (s.road === "stay" && s.ruthAlive && s.livingKilled < 3) return "door";
    if (s.road === "stay") return "thin";
    return "ash";
  }

  function memories(s) {
    const bits = [];
    if (s.harris === "quiet") bits.push("You killed Dean out of Mia's sight. She heard it anyway.");
    else if (s.harris === "told") bits.push("Dean told Mia he was bitten, because you made him. Then you ended it." + (s.carriedPaid ? " You sat with her afterward, like you said you would." : ""));
    else if (s.harris === "turned") bits.push("You kept driving with Dean's bite. He turned in the back seat. Mia was in the front. She had already told you.");
    if (s.hidThomas) bits.push("You hid the school note. Mia found it. Mom has Leo. They were going to the bridge.");
    else if (s.asked) bits.push("You let Mia say Leo's name before the note did. He's eight. He sleeps with one shoe on. Mom has him.");
    else if (s.toldThomas) bits.push("You put the note in her hand. Mom has Leo. Army bridge. They did not leave her.");
    if (s.meds === "ruth") bits.push("Helen saw the morning. Jonah didn't. The bite showed itself at dawn. There was only one bottle.");
    else if (s.meds === "sam") bits.push("Jonah ate. Helen didn't. Dale runs the farm now, and he says it plain.");
    else if (s.meds === "kept") bits.push("You kept the medicine. Helen and Jonah both missed the morning.");
    if (s.ellisExit === "dead") bits.push("Rico died at the roadblock. It started when you took the cooler.");
    else if (s.ellisExit === "voss") bits.push("Rico went with Kane's trucks. He nodded once and didn't look back.");
    else if (s.ellisWith) bits.push("Rico walks where the work is. He still takes the loud side.");
    else if (s.robbed) bits.push("Somewhere a mechanic is still angry about a cooler of peaches. You know the weight of the can.");
    if (s.stranger === "cut") bits.push("You killed a woman in a crashed car before she finished turning. It was loud. It was quicker than leaving her.");
    else if (s.stranger === "left") bits.push("You left a woman beating on the glass of her car. She was already turning.");
    if (s.voss === "parley") bits.push("Half the food bought an open road. Kane kept his word.");
    else if (s.vossDead) bits.push("Kane is dead. The food stayed. The road to the bridge opened because of a fight.");
    else if (s.voss === "trade") bits.push("You put Mia on the table. Kane took her. The farm is still standing.");
    if (s.hour === "sharpen") bits.push("You spent the quiet hour on the sword. The edge shows it.");
    else if (s.swordDown) bits.push("You put the sword in the dirt and walked the fence with Mia. You picked it up when the trucks came.");
    else if (s.hour === "food") bits.push("Mia said the peaches tasted like a normal morning. You didn't ask her to thank you.");
    if (s.gaveCar) bits.push("Nora has the car. You walked.");
    if ((s.swordRank || 0) >= 3) bits.unshift("The school sword is sharpened, and you warmed the spine so it won't crack.");
    else if (s.swordTold) bits.unshift("You told Mia the sword was at school for Saturday class. Then you took it back.");
    else if ((s.swordRank || 0) > 0) bits.unshift("You took the school sword and saved the explanation for later.");
    if ((s.falls || 0) > 0) {
      const dull = !s.sharpened && (s.bladeWear || 0) >= 0.08;
      const once = s.falls === 1;
      bits.unshift(once
        ? "You fell once and stood back up. " + (dull ? "The edge kept the nick." : "The stone took the nick off.")
        : "You fell more than once and stood back up. " + (dull ? "The edge kept every nick." : "The stone took the nicks off."));
    }
    return bits.slice(0, (s.falls || 0) > 0 ? 6 : 5);
  }

  function ending(s) {
    const type = endingOf(s);
    const mem = memories(s);
    const closings = {
      door: [
        "In the morning the sword is by the door, where people can see it. Mia steps over it. Someone on the fence calls your name like it is a job.",
        "You answer. At night the corn still tries your name, and Mom's, perfect as dinner. You don't answer that one. The bridge is still out there. Today the farm is still a farm.",
      ],
      thin: [
        "You stay. People flinch when the sword passes a doorway. Dale counts cans and does not ask you for stories.",
        "The gate holds. At night something past it practices the way you say hello. You take the watch anyway, and you do not say hello back.",
      ],
      june: [
        "You do not promise Mia that Leo is alive. She does not ask you to. The farm gets small behind you. She walks on your left.",
        "The loudspeaker is still going when you reach the tents. It knows how you say her name. If Mom is here, you will see her. If she isn't, the voice will keep her anyway.",
      ],
      signal: [
        "Sam holds the radio like it might break. A voice says a street you know. Under it, very quiet, is a laugh with no air in it.",
        "You keep walking. A voice is a person until it starts wearing someone you love. The bridge is still the way through.",
      ],
      ash: [
        "No one is behind you. You check anyway. Something back there says your name in a voice you trust.",
        "You don't turn around. Millford closes like a mouth that has learned how you sound.",
      ],
      trade: [
        "The food stays. The watch changes. Nobody stands on your left. Dale will not say her name, and you will not make him.",
        "At night the loudspeaker says Mia's name once, perfectly. You are the one who put her where it could learn her.",
      ],
    };
    const titles = {
      door: "You Stay",
      thin: "A Thin Gate",
      june: "The Bridge",
      signal: "The Radio",
      ash: "Alone",
      trade: "The Trade",
    };
    return {
      type,
      title: titles[type],
      kicker: "Day 5  —  " + (s.name || "Alex"),
      paragraphs: mem.concat(closings[type]),
    };
  }

  function createState(name) {
    const clean = String(name || "Alex").replace(/[<>]/g, "").trim().slice(0, 18) || "Alex";
    return {
      name: clean,
      juneTrust: 0,
      ellisTrust: 0,
      calTrust: 0,
      ellisWith: false,
      ellisAlive: true,
      ellisRaider: false,
      ellisExit: "",
      calWith: false,
      harris: "none",
      plan: "",
      robbed: false,
      food: 1,
      meds: "",
      ruthAlive: true,
      samAlive: true,
      peteAlive: true,
      livingKilled: 0,
      bladeWear: 0,
      sharpened: false,
      weapon: "pipe",
      swordRank: 0,
      swordTold: false,
      voss: "",
      sparedVoss: false,
      vossDead: false,
      road: "",
      juneAlive: true,
      saidFever: "",
      carried: false,
      carriedPaid: false,
      hour: "",
      stranger: "",
      gaveCar: false,
      waited: false,
      brother: "",
      water: false,
      swordDown: false,
      toldThomas: false,
      hidThomas: false,
      asked: false,
      day: 3,
      falls: 0,
      lastFall: "",
      mentionFall: false,
      mentionPull: false,
      pending: {},
      juneDown: 0,
      ellisDown: 0,
      calDown: 0,
      juneDownTold: 0,
      ellisDownTold: 0,
      calDownTold: 0,
      journal: ["Day 3. Mom has Leo. They are going to the army bridge. Mia found you at the community center. You have a pipe and a short knife. The school sword is still at the school."],
      hp: 100,
      place: "Millford",
      node: "",
      _did: {},
      _wear: 0,
    };
  }

  const BEFORE_SWORD = {
    opening: 1, courtyard_reply: 1, voices_lot: 1, fight_glass: 1, shoe: 1, confront: 1,
    black_quiet: 1, black_told: 1, after_quiet: 1, after_told: 1,
    delay_leave: 1, secret_leave: 1, car_dark: 1, walk_gas: 1, ellis_meet: 1,
    fight_pump: 1, after_join: 1, after_leave: 1, fight_lot: 1, after_lot: 1,
    harris_check: 1, black_late_quiet: 1, black_late_told: 1, late_after: 1, late_keep: 1,
    bus_dark: 1, overpass_calm: 1, black_stranger: 1, fight_noise: 1, left_stranger: 1,
    overpass_turn: 1, fight_turn: 1, after_turn: 1, truck: 1, black_brother: 1,
    after_brother: 1, wait_brother: 1, fight_trees: 1, after_trees: 1,
    give_car: 1, cal_join: 1, fight_road: 1, walk_school: 1, school_door: 1, school_dark: 1,
    fight_gym: 1, school_paper: 1, after_paper: 1, sword_case: 1,
  };

  function migrate(s, node) {
    if (s.swordRank == null) s.swordRank = 0;
    if (s.swordTold == null) s.swordTold = false;
    if (!s.weapon) s.weapon = s.swordRank > 0 ? "sword" : "pipe";
    if (s.swordRank < 1 && node && !BEFORE_SWORD[node]) {
      s.swordRank = s.sharpened ? 2 : 1;
      s.weapon = "sword";
      if (!s._swordMigrated) {
        s._swordMigrated = true;
        if (!s.journal) s.journal = [];
        s.journal.push("The school sword was already in your hand. The care card said: sharpen the edge, warm the spine, don't grind the groove.");
      }
    }
  }

  root.Story = { NODES, match, apply, fill, resolve, onEnter, relations, ending, createState, dayOf, remember, readyLines, hear, migrate };
})(window);
