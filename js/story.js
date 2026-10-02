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
    return String(text).replaceAll("{name}", s.name || "Mara");
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
    { id: "overpass_calm" },
  ];

  const NODES = {
    opening: {
      kind: "talk",
      card: "The Glass",
      kicker: "Day 9  —  Harrow Creek",
      arena: "dojo",
      lines: [
        { text: "The phones are ornaments. The dead are not." },
        { text: "You locked the dojo because the glass was still glass. Now the glass is only a sound." },
        { speaker: "June", text: "My mom said six. She said if it got bad, go to {name}, and don't go with anybody else." },
        { speaker: "Harris", text: "I paid for five to six. I am not being difficult. I am saying the hour is over and the hour is still in the room." },
      ],
      choices: [
        { text: "We wait with the lights off. If she's coming, she knows the side door.", set: { plan: "wait", juneTrust: "+1" }, log: "You told June you would wait for her mother.", next: "courtyard_reply" },
        { text: "Six was hours ago. Behind my left shoulder. Don't look at their mouths.", set: { plan: "cut" }, log: "You moved June before she was ready.", next: "courtyard_reply" },
        { text: "Harris. Walk her to the car. I'll make a path.", set: { plan: "harris", juneTrust: "-1", harris: "obvious" }, log: "You put Harris between June and the dead.", next: "courtyard_reply" },
      ],
    },
    courtyard_reply: {
      kind: "talk",
      arena: "dojo",
      place: "The Glass",
      lines: [
        { speaker: "June", text: "Okay. Side door. I can be quiet.", when: { plan: "wait" } },
        { speaker: "Harris", text: "Quiet is a plan until it isn't.", when: { plan: "wait" } },
        { speaker: "June", text: "She might still be on the road.", when: { plan: "cut" } },
        { text: "You put her on your left, where the blade isn't.", when: { plan: "cut" } },
        { speaker: "Harris", text: "I paid for a lesson, not a lane through them.", when: { plan: "harris" } },
        { text: "You give him the keys anyway. His hand is already wet.", when: { plan: "harris" } },
        { speaker: "June", text: "That's not what my mom said.", when: { plan: "harris" } },
        { text: "They come through the front like the front was a suggestion." },
      ],
      next: "fight_glass",
    },
    fight_glass: {
      kind: "combat",
      arena: "dojo",
      place: "The Glass",
      easy: true,
      tip: "Click cuts. Right mouse blocks. Space dodges. Keep them in front of the blade. A red flash means they are about to grab.",
      spawn: [{ type: "shambler", count: 3 }],
      next: "shoe",
    },
    shoe: {
      kind: "talk",
      arena: "dojo",
      lines: [
        { text: "The lot goes quiet the way a room goes quiet when a glass is about to finish falling." },
        { text: "Harris wipes his shoe on the mat. The mat remembers it.", when: { harris_ne: "obvious" } },
        { speaker: "Harris", text: "Ankle. Glass. I'm fine.", when: { harris: "obvious" } },
        { speaker: "June", text: "That's not glass. Glass isn't dark like that.", when: { harris: "obvious" } },
      ],
      choices: [
        { text: "Harris. Sit down and take the shoe off.", next: "confront" },
        { text: "June, seatbelt. We're leaving while the road is empty.", set: { harris: "secret" }, log: "You saw the shoe and put June in the car anyway.", next: "secret_leave", when: { harris_ne: "obvious" } },
      ],
    },
    confront: {
      kind: "talk",
      arena: "dojo",
      lines: [
        { speaker: "Harris", text: "Don't. Not in front of her. It's a cut from the door." },
        { speaker: "June", text: "I'm not six. I know what people do when they don't want me to look." },
      ],
      choices: [
        { text: "June. Other side of the brick. Count slow.", set: { harris: "quiet", juneTrust: "-1" }, log: "You sent June away and ended Harris where she could still hear it.", next: "black_quiet" },
        { text: "Look at her and tell the truth. Then I'll be quick.", set: { harris: "told", juneTrust: "+1" }, log: "You made Harris tell June, and then you ended it in front of her.", next: "black_told" },
        { text: "Back seat. Towel on the ankle. You tell me if the cold climbs.", set: { harris: "delayed" }, log: "You let Harris keep the bite for the drive.", next: "delay_leave" },
      ],
    },
    black_quiet: {
      kind: "black",
      arena: "dojo",
      text: "You send June to the far side of the brick.\nYou tell her to count.\nThe sword does not ring. It is too close for that.\nShe gets to eighty-seven.",
      next: "after_quiet",
    },
    black_told: {
      kind: "black",
      arena: "dojo",
      text: "Harris looks at her because you told him to.\nHe says he is sorry about the hour he paid for.\nYou are quick. Quick is not the same as kind.\nJune does not look away. You do not get to ask her to.",
      next: "after_told",
    },
    after_quiet: {
      kind: "talk",
      arena: "dojo",
      lines: [
        { speaker: "June", text: "I heard you stop. I didn't hear him fall. Is that worse?" },
      ],
      choices: [
        { text: "Worse. And I need you to know that.", set: { juneTrust: "+1" }, log: "You told June the quiet killing was worse, not cleaner.", next: "walk_gas" },
        { text: "Get in. Counting's over.", log: "You told June the counting was over.", next: "walk_gas" },
      ],
    },
    after_told: {
      kind: "talk",
      arena: "dojo",
      lines: [
        { speaker: "June", text: "He looked at me. You made him look at me." },
        { speaker: "June", text: "I'm not going to pretend I didn't see a person stop." },
      ],
      choices: [
        { text: "Don't look away from it.", log: "You told June not to look away.", next: "walk_gas" },
        { text: "You don't have to carry the picture. I'll carry it.", set: { carried: true }, log: "You told June you would carry what Harris looked like at the end.", next: "walk_gas" },
      ],
    },
    delay_leave: {
      kind: "talk",
      arena: "dojo",
      lines: [
        { speaker: "Harris", text: "Thank you. I'll say if it changes. I will." },
        { speaker: "June", text: "He didn't take the shoe off." },
        { text: "You drive with the sword between the seats, where both of them can see it." },
      ],
      next: "walk_gas",
    },
    secret_leave: {
      kind: "talk",
      arena: "dojo",
      lines: [
        { speaker: "June", text: "He keeps touching his leg." },
        { text: "You keep your eyes on the road that used to be a road." },
      ],
      next: "walk_gas",
    },
    walk_gas: {
      kind: "explore",
      card: "The Pump",
      kicker: "Day 9, night",
      arena: "gas",
      marker: "ellis",
      hint: "A man is working a hose the ground doesn't owe him.",
      spawn: [{ type: "shambler", count: 1, ambient: true }],
      next: "ellis_meet",
    },
    ellis_meet: {
      kind: "talk",
      arena: "gas",
      lines: [
        { speaker: "Ellis", text: "Pump's dead. I'm not. That's a limited-time offer." },
        { speaker: "Ellis", text: "Name's Ellis Ward. I had a full tank on day one. I gave three rides. You can guess what the fourth person did." },
        { speaker: "June", text: "He smells like the garage at school.", when: { juneTrust_gte: 0 } },
        { speaker: "June", text: "Don't let him in the car.", when: { juneTrust_lt: 0 } },
        { speaker: "Ellis", text: "Kid looks at that sword like it already ate.", when: { harris: "quiet" } },
        { speaker: "Harris", text: "I'm fine. Drive.", when: { harris: "secret" } },
        { speaker: "Harris", text: "If we could just get to a pharmacy.", when: { harris: "delayed" } },
        { speaker: "Ellis", text: "Cooler's mine. Peaches and beans. I am telling you that before anybody gets brave." },
      ],
      choices: [
        { text: "Put the sword where he can see it. The car fits us. You siphon, I drive.", set: { ellisWith: true, ellisTrust: "+1" }, log: "You let Ellis Ward into the car.", next: "fight_pump" },
        { text: "The cooler. Then you can keep the hose.", set: { robbed: true, ellisRaider: true, ellisTrust: "-2", food: "+1" }, log: "You took Ellis's peaches and beans.", next: "fight_lot" },
        { text: "Leave the lot. Don't look at the cooler.", set: { ellisWith: false }, log: "You left Ellis with the pumps.", next: "fight_pump" },
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
        { speaker: "Ellis", text: "You swing that thing like a job. I respect a job. I don't love it." },
        { speaker: "June", text: "He didn't run.", when: { juneTrust_lt: 0 } },
      ],
      next: AFTER_GAS,
    },
    after_leave: {
      kind: "talk",
      arena: "gas",
      lines: [
        { text: "Ellis stays with the hose. He lifts a hand, not quite a wave, and then the dark takes the pumps." },
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
        { text: "He shouts your theft into the lot until the dead answer him. Then he runs." },
        { text: "He looks back once. The cooler is heavier than it was." },
      ],
      next: AFTER_GAS,
    },
    harris_check: {
      kind: "talk",
      arena: "gas",
      lines: [
        { speaker: "June", text: "He's been quiet since the tire shop. Quiet isn't better." },
        { speaker: "Harris", text: "I thought I could make a pharmacy. You had her in the front. I didn't want the lesson." },
        { text: "The towel is the wrong color now." },
      ],
      choices: [
        { text: "June. Other side of the pumps. Count again.", set: { harris: "quiet", juneTrust: "-1" }, log: "You sent June away again and ended Harris at the pumps.", next: "black_late_quiet" },
        { text: "Show her the leg. Then I'll be quick.", set: { harris: "told" }, log: "You made the bite visible before you ended it. Late, but visible.", next: "black_late_told" },
        { text: "Not yet. We need the miles.", log: "You left the bite alone for the miles.", next: "late_keep" },
      ],
    },
    black_late_quiet: {
      kind: "black",
      text: "The pumps tick as they cool.\nYou do it without a speech.\nJune counts anyway. She never needed you to start her.",
      next: "late_after",
    },
    black_late_told: {
      kind: "black",
      text: "He shows her because there is nowhere left to put the leg.\nShe nods like a student who hates the teacher and will still remember the form.\nYou are quick. The hour for quick was the dojo.",
      next: "late_after",
    },
    late_after: {
      kind: "talk",
      arena: "gas",
      lines: [
        { speaker: "June", text: "Don't tell me what number I got to.", when: { harris: "quiet" } },
        { speaker: "June", text: "You waited until the towel decided.", when: { harris: "told" } },
      ],
      next: "overpass_calm",
    },
    late_keep: {
      kind: "talk",
      arena: "gas",
      lines: [
        { speaker: "June", text: "If he changes in the back, I am not sitting up front like a person who didn't know." },
        { text: "You drive anyway." },
      ],
      next: "overpass_turn",
    },
    overpass_calm: {
      kind: "talk",
      card: "The Overpass",
      kicker: "Day 9, later",
      arena: "overpass",
      lines: [
        { text: "A car sits half on the shoulder. The woman in it is past talking. Her hands keep the glass honest." },
        { speaker: "June", text: "She's going to hurt herself before she hurts anybody else." },
        { speaker: "Ellis", text: "Noise is a door. You sure you want another door?", when: { ellisWith: true } },
      ],
      choices: [
        { text: "Break the glass. End it before she wears her hands down.", set: { stranger: "cut", calTrust: "+1" }, log: "You broke the car glass and ended the woman inside.", next: "black_stranger" },
        { text: "Leave her. Noise is how more of them find June.", set: { stranger: "left", calTrust: "-1" }, log: "You left a woman tapping on the car glass.", next: "left_stranger" },
      ],
    },
    black_stranger: {
      kind: "black",
      text: "The glass gives.\nShe does not say a name.\nYou hope that means there wasn't one left, and you know hope is a lazy tool.",
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
        { text: "You leave the tapping behind you. It stays in the ear longer than the road." },
      ],
      next: "truck",
    },
    overpass_turn: {
      kind: "talk",
      card: "The Overpass",
      kicker: "Day 9, later",
      arena: "overpass",
      onEnter: { juneTrust: "-2" },
      log: "Harris turned in the car because you kept the miles.",
      lines: [
        { text: "The back seat makes a sound the back seat should not know." },
        { speaker: "June", text: "I told you. I told you I wasn't going to sit here and not know." },
        { speaker: "Ellis", text: "I had one bullet at the pumps. You didn't ask.", when: { ellisWith: true } },
      ],
      next: "fight_turn",
    },
    fight_turn: {
      kind: "combat",
      arena: "overpass",
      onEnter: { harris: "turned" },
      spawn: [{ type: "runner", count: 1, name: "Harris" }, { type: "shambler", count: 2 }],
      next: "after_turn",
    },
    after_turn: {
      kind: "talk",
      arena: "overpass",
      lines: [
        { speaker: "June", text: "Don't say his name like you spent it carefully." },
        { text: "The sword is busy. Your hands are not cleaner for the work." },
      ],
      next: "truck",
    },
    truck: {
      kind: "talk",
      card: "The Truck",
      kicker: "Day 9, late",
      arena: "truck",
      lines: [
        { speaker: "Nedra", text: "He's my brother. He's also the last door on this truck. Ian can still make sentences. That's the problem and the mercy." },
        { speaker: "Ian", text: "Don't let me finish the long way. Nedra won't say it. I'm saying it." },
        { speaker: "Cal", text: "A man who is still talking is not a grave. I'm Cal. The brother part was a job. Cal is enough." },
        { speaker: "Cal", text: "I passed a car on the shoulder. Someone had already done the hard thing. I blessed the road anyway.", when: { stranger: "cut" } },
        { speaker: "Cal", text: "I passed a car where a woman was still asking the glass for something. I will remember the person who walked on.", when: { stranger: "left" } },
        { speaker: "June", text: "He sounds like my uncle did on the phone. On day two. We hung up to save the battery." },
      ],
      choices: [
        { text: "I'll cut the rope. He doesn't have to finish the sentence.", set: { brother: "cut", calTrust: "-1", water: true }, log: "You ended Ian Cole while he could still talk.", next: "black_brother" },
        { text: "I'll wait with you. If he turns, I won't be late.", set: { brother: "wait", calTrust: "+1", waited: true, water: true }, log: "You waited with Ian Cole until the talking stopped.", next: "wait_brother" },
        { text: "Take the car. We'll walk. Keys are kinder than the sword.", set: { brother: "car", calTrust: "+1", ellisTrust: "-1", gaveCar: true, water: true }, log: "You gave Nedra the car and walked.", next: "give_car" },
      ],
    },
    black_brother: {
      kind: "black",
      text: "Ian thanks you, which is a rotten kind of thanks.\nNedra holds his hand until you ask her, with your eyes, to hold his shoulder instead.\nThe sword stays a tool. Nobody applauds a tool.",
      next: "after_brother",
    },
    after_brother: {
      kind: "talk",
      arena: "truck",
      lines: [
        { speaker: "Nedra", text: "There's water in the blue jug. Take it. I don't want a speech and I don't want you looking at the truck bed." },
        { speaker: "Cal", text: "You were fast. Fast is a gift and a habit. I am not sure which one I just watched." },
        { speaker: "Ellis", text: "Habit. You can hear it in the swing.", when: { ellisWith: true } },
      ],
      next: "cal_join",
    },
    wait_brother: {
      kind: "talk",
      arena: "truck",
      lines: [
        { speaker: "Ian", text: "Then stay where I can see the sword. I don't want Nedra to have to learn it." },
        { text: "The treeline answers before the hour does." },
      ],
      next: "fight_trees",
    },
    fight_trees: {
      kind: "combat",
      arena: "truck",
      spawn: [{ type: "runner", count: 1, name: "Ian" }, { type: "shambler", count: 4 }],
      next: "after_trees",
    },
    after_trees: {
      kind: "talk",
      arena: "truck",
      lines: [
        { speaker: "Nedra", text: "He got what he asked, just not from the quiet. Take the water. Go before I start agreeing with the dead." },
        { speaker: "Cal", text: "You waited. That counts. It doesn't spend." },
      ],
      next: "cal_join",
    },
    give_car: {
      kind: "talk",
      arena: "truck",
      lines: [
        { speaker: "Nedra", text: "I won't waste the tank on a scenic route. If he turns, I won't be brave. I'll be quick. You taught me the shape of it by offering the keys." },
        { speaker: "Ellis", text: "We are walking because you like being the person who gives cars away.", when: { ellisWith: true } },
        { speaker: "June", text: "My feet are fine. Don't make it a lesson.", when: { ellisWith: false } },
        { speaker: "Cal", text: "A key given is a prayer with a receipt. I'll take it." },
      ],
      next: "cal_join",
    },
    cal_join: {
      kind: "talk",
      arena: "truck",
      lines: [
        { speaker: "Cal", text: "I'm going where the talking people are. That can be your road or it can be a different one." },
      ],
      choices: [
        { text: "Then keep up. Left side is June's.", set: { calWith: true }, log: "You let Cal walk with you.", next: "fight_road" },
        { text: "Find a different road. I mean it.", set: { calWith: false, calTrust: "-1" }, log: "You sent Cal away.", next: "fight_road" },
      ],
    },
    fight_road: {
      kind: "combat",
      arena: "overpass",
      place: "The road",
      spawn: (s) => {
        const extra = s.stranger === "cut" ? 1 : 0;
        if (s.gaveCar) return [{ type: "shambler", count: 4 + extra }, { type: "runner", count: 2 }];
        return [{ type: "shambler", count: 3 + extra }, { type: "runner", count: 1 }];
      },
      next: "walk_school",
    },
    walk_school: {
      kind: "explore",
      card: "The Classroom",
      kicker: "Day 10",
      arena: "school",
      marker: "door",
      hint: "June knows the side door. She does not want to.",
      spawn: [{ type: "shambler", count: 2, ambient: true }],
      next: "school_door",
    },
    school_door: {
      kind: "talk",
      arena: "school",
      lines: [
        { speaker: "June", text: "This is the door I'm late through. Don't make it a metaphor. I'm just saying I know which handle sticks." },
        { text: "Inside, something scrapes a locker the way a shoulder scrapes a wall when the person isn't steering anymore." },
      ],
      next: "fight_gym",
    },
    fight_gym: {
      kind: "combat",
      arena: "school",
      spawn: [{ type: "shambler", count: 4 }, { type: "runner", count: 1 }],
      next: "school_paper",
    },
    school_paper: {
      kind: "talk",
      arena: "school",
      lines: [
        { text: "A clipboard on the trophy case, emergency pickup, written in a teacher's fast hand: THOMAS PELL." },
        { text: "June is sixteen. Thomas is the younger one. The paper has been waiting longer than you have." },
      ],
      choices: [
        { text: "Ask her where Thomas is before you show her the paper.", set: { asked: true, toldThomas: true, juneTrust: "+1" }, log: "You asked June about Thomas before you showed her the pickup list.", next: "after_paper" },
        { text: "Put the paper in her hand. No speech.", set: { toldThomas: true }, log: "You handed June the paper with her brother's name and didn't dress it up.", next: "after_paper" },
        { text: "Fold it into your coat.", set: { hidThomas: true }, log: "You hid Thomas Pell's name in your coat.", next: "after_paper" },
      ],
    },
    after_paper: {
      kind: "talk",
      arena: "school",
      lines: [
        { speaker: "June", text: "He's eleven. Aunt's house on Brier Street. He sleeps with one shoe on. I don't know why that's the part I say.", when: { asked: true } },
        { speaker: "June", text: "You let me say it before the paper did. Thank you. I hate that I have to thank you.", when: { asked: true } },
        { speaker: "June", text: "Brier Street. If you're about to tell me not to hope, don't. I already know the shape of a street.", when: { toldThomas: true, asked: false } },
        { text: "The paper rides against your ribs. It knows more than June does, for now.", when: { hidThomas: true } },
        { speaker: "Ellis", text: "Brier's east. If we live long enough to be lost, that's the direction.", when: { ellisWith: true, toldThomas: true } },
        { speaker: "Cal", text: "A name written down is still a name. That's not nothing.", when: { calWith: true, toldThomas: true } },
      ],
      next: "walk_farm",
    },
    walk_farm: {
      kind: "explore",
      card: "Miller's",
      kicker: "Day 10, afternoon",
      arena: "farm",
      marker: "gate",
      hint: "A gate, a rifle barrel, and a man who has already decided he might not like you.",
      spawn: [{ type: "shambler", count: 1, ambient: true }],
      next: "farm_gate",
    },
    farm_gate: {
      kind: "talk",
      arena: "farm",
      lines: [
        { speaker: "Owen", text: "Sword goes in the dirt before the speech. I'm Owen Miller. The woman with the fever in the house is my mother, Ruth. She still runs the names." },
        { speaker: "Owen", text: "A kid at the pumps told a story about a teacher who does the cutting where children can count. That you?", when: { harris: "quiet" } },
        { speaker: "Owen", text: "Mechanic with a wrench came through angry. Said a sword took his food. If that was you, say it before the porch does.", when: { robbed: true } },
        { speaker: "June", text: "I wanted Thomas from you. Not from a pocket.", when: { hidThomas: true } },
        { speaker: "June", text: "This place has a fence. Don't promise me it means something.", when: { juneTrust_gte: 1 } },
      ],
      choices: [
        { text: "The sword stays in the dirt. Ask Ruth what she needs.", log: "You put the sword down at Miller's gate.", next: "ruth_talk" },
        { text: "I'll hold it. If something comes up the lane, the dirt is a bad sheath.", log: "You would not put the sword down for Owen.", next: "ruth_talk" },
      ],
    },
    ruth_talk: {
      kind: "talk",
      arena: "farm",
      lines: [
        { speaker: "Ruth", text: "I don't need a performance. I need someone who can decide while the rest of us are still hoping. There's one bottle. Real antibiotics. The date on it is a lie we are choosing to believe." },
        { speaker: "Ruth", text: "I'm septic. Not bitten. Ordinary dirt in a cut, which feels like an insult. And there's Sam Ibarra in the side room. Eight. Fever. Nobody saw a bite. Nobody looked hard enough to swear." },
        { speaker: "Owen", text: "You pick wrong, you say it at breakfast. We don't do quiet mercy here unless the mercy asks." },
      ],
      next: "sam_truth",
    },
    sam_truth: {
      kind: "talk",
      arena: "farm",
      lines: [
        { speaker: "June", text: "Sam sat behind Thomas in assembly. He cried at the fire drill. That's the whole dossier. Don't talk over him like he's a number." },
        { text: "You stand in the doorway. Sam's eyes are open. His sleeve is damp where somebody already checked, or pretended to." },
      ],
      choices: [
        { text: "That's a bite until a morning proves it isn't. Say it while it can be said.", set: { saidFever: "bite", juneTrust: "+1" }, log: "You called Sam's fever a bite out loud.", next: "meds" },
        { text: "It could be a cold. We don't bury a guess.", set: { saidFever: "cold" }, log: "You called Sam's fever a cold.", next: "meds" },
      ],
    },
    meds: {
      kind: "talk",
      arena: "farm",
      lines: [
        { speaker: "Ruth", text: "One bottle. If you split it, you waste it. I've done the arithmetic. I hate the arithmetic." },
        { speaker: "June", text: "You already said what you think he is.", when: { saidFever: "bite" } },
        { speaker: "June", text: "You said cold. Say it again if you're about to spend him.", when: { saidFever: "cold" } },
      ],
      choices: [
        { text: "Ruth gets the bottle. The farm dies if the woman who knows the names dies.", set: { meds: "ruth", samAlive: false, ruthAlive: true, peteAlive: true }, log: "You gave the antibiotics to Ruth.", next: "after_meds", when: { saidFever: "bite" } },
        { text: "Ruth gets the bottle. You already called the boy a cold so this could be easier.", set: { meds: "ruth", samAlive: false, ruthAlive: true, peteAlive: true, juneTrust: "-1" }, log: "You named a bite a cold, then spent the medicine on Ruth.", next: "after_meds", when: { saidFever: "cold" } },
        { text: "Sam gets it. He's small, and he's scared, and I won't make June watch me choose a ledger.", set: { meds: "sam", samAlive: true, ruthAlive: false, peteAlive: false, juneTrust: "+1" }, log: "You gave the antibiotics to Sam.", next: "after_meds" },
        { text: "The bottle stays in the coat. I don't know enough.", set: { meds: "kept", samAlive: false, ruthAlive: false, peteAlive: false, juneTrust: "-1" }, log: "You kept the medicine in your coat.", next: "after_meds" },
      ],
    },
    after_meds: {
      kind: "talk",
      arena: "farm",
      lines: [
        { speaker: "Owen", text: "Then we hold the fence like people who still have a mother giving orders.", when: { ruthAlive: true } },
        { speaker: "Owen", text: "All right. Then I'm the name. Don't make me thank you for picking the boy. I won't. I'll run the watch.", when: { meds: "sam" } },
        { speaker: "Owen", text: "I can smell the plastic when you move. You kept it. If the night takes this place, you remember the weight of that coat.", when: { meds: "kept" } },
        { speaker: "Pete", text: "Left side's mine. You take the gate. Try not to enjoy it.", when: { peteAlive: true } },
        { text: "The fields go the color of a bruise. Something at the tree line has decided the fence is a rumor.", when: { peteAlive: false } },
      ],
      next: "night_talk",
    },
    night_talk: {
      kind: "talk",
      card: "What the Fence Knows",
      kicker: "Day 10, night",
      arena: "farmNight",
      lines: [
        { speaker: "June", text: "If I go left, you don't get to be noble about it. Just tell me where your sword isn't." },
        { speaker: "Ellis", text: "I'll take the loud side. Kid stays where she can see a person who isn't swinging.", when: { ellisWith: true } },
        { speaker: "Cal", text: "I'll pray low. If that bothers you, pretend it's counting.", when: { calWith: true } },
        { text: "They come the way weather comes. The fence finds out what it was worth." },
      ],
      next: "fight_fence",
    },
    fight_fence: {
      kind: "combat",
      arena: "farmNight",
      spawn: (s) => [
        { type: "shambler", count: s.ruthAlive ? 5 : 8 },
        { type: "runner", count: s.ruthAlive ? 1 : 2 },
      ],
      next: "morning",
    },
    morning: {
      kind: "talk",
      card: "Morning",
      kicker: "Day 11",
      arena: "farm",
      lines: [
        { text: "You get one quiet hour. The trucks on the county road will spend the rest." },
        { speaker: "Ruth", text: "Sam didn't see this light. The fever broke into a bite near dawn. You don't have to say you knew.", when: { meds: "ruth" } },
        { speaker: "Owen", text: "Sam ate. That's the report. My mother didn't. I will not make the report prettier.", when: { meds: "sam" } },
        { speaker: "Owen", text: "Both of them. And the bottle still clicks when you breathe. Get off my porch when the hour's done.", when: { meds: "kept" } },
        { speaker: "Pete", text: "Gate held. Don't name that after yourself.", when: { peteAlive: true } },
        { speaker: "June", text: "If you're going to sit, sit. If you're going to sharpen, do it where I don't have to watch the stone like it's a person.", when: { juneTrust_gte: 0 } },
        { speaker: "June", text: "Don't spend the hour on me. I'm still here. That's the favor.", when: { juneTrust_lt: 0 } },
      ],
      choices: [
        { text: "Sit with June and don't fill the quiet. You said you would carry the picture.", set: { carriedPaid: true, juneTrust: "+1", hour: "june" }, log: "You spent the quiet hour with June, the way you said you would.", next: "after_morning", when: { carried: true } },
        { text: "Walk the fence with June. Leave the sword in the dirt.", set: { juneTrust: "+1", swordDown: true, hour: "fence" }, log: "You left the sword in the dirt and walked the fence with June.", next: "after_morning", when: { juneTrust_gte: 0 } },
        { text: "Give June the last of the peaches.", set: { food: "-1", juneTrust: "+1", hour: "food" }, log: "You gave June the last can of peaches.", next: "after_morning", when: { food_gte: 1 } },
        { text: "Put the stone to the blade and let the hour be a blade hour.", set: { sharpened: true, bladeWear: 0, hour: "sharpen" }, log: "You spent the quiet hour sharpening the sword.", next: "after_morning" },
      ],
    },
    after_morning: {
      kind: "talk",
      arena: "farm",
      lines: [
        { speaker: "June", text: "Okay. That's enough hour.", when: { hour: "june" } },
        { text: "The sword looks smaller in the dirt. You pick it up when the engines start, because dirt does not keep a weapon and neither do you.", when: { hour: "fence" } },
        { speaker: "June", text: "They taste like a door shut soft. Don't ruin it by asking if I'm grateful.", when: { hour: "food" } },
        { text: "The edge comes back. Everything you didn't say stays dull.", when: { hour: "sharpen" } },
        { speaker: "Owen", text: "Trucks. Two. They stopped where the corn can hear them." },
      ],
      next: "walk_voss",
    },
    walk_voss: {
      kind: "explore",
      card: "Seed",
      kicker: "Day 11",
      arena: "roadblock",
      marker: "voss",
      hint: "Voss wants the seed corn. He has trucks and people who are not dead.",
      spawn: [{ type: "shambler", count: 1, ambient: true }],
      next: "voss_talk",
    },
    voss_talk: {
      kind: "talk",
      arena: "roadblock",
      lines: [
        { speaker: "Voss", text: "Half the seed corn. You keep the people, the well, and the story you tell about yourselves. I keep my trucks from becoming a fire." },
        { speaker: "Voss", text: "Voss is the whole name. Don't spend time looking for a softer one." },
        { speaker: "Ellis", text: "You took the cooler. He took me in. Get off the high horse before it bites you.", when: { ellisRaider: true } },
        { speaker: "June", text: "Don't trade anything that has a name.", when: { juneAlive: true, juneTrust_gte: 0 } },
        { speaker: "Cal", text: "Corn is not a child. It is also not nothing. Choose like you'll eat the consequence.", when: { calWith: true } },
      ],
      choices: [
        { text: "The peaches were wrong. Come back anyway.", set: { ellisRaider: false, ellisWith: true, ellisAlive: true, ellisTrust: 0, ellisExit: "" }, log: "You asked Ellis to come back, and he did.", next: "ellis_down", when: { ellisRaider: true, harris_nin: ["quiet", "turned"] } },
        { text: "Half the corn. Take your trucks, and the mechanic if he still wants them.", set: { voss: "parley", sparedVoss: true, ellisRaider: false, ellisExit: "voss", ellisWith: false, calTrust: "+1" }, log: "You gave Voss half the seed corn.", next: "after_parley", when: { ellisRaider: true } },
        { text: "Half the seed corn. You leave the people and the gate.", set: { voss: "parley", sparedVoss: true, calTrust: "+1" }, log: "You gave Voss half the seed corn.", next: "after_parley", when: { ellisRaider: false } },
        { text: "No.", set: { voss: "fight" }, log: "You refused Voss.", next: "fight_raiders" },
        { text: "Just you and me. They stay back.", set: { voss: "duel" }, log: "You offered Voss a single fight.", next: "fight_duel" },
        { text: "Take the girl and leave the farm. You hear yourself say it. You do not take it back.", set: { juneAlive: false, voss: "trade", calWith: false, calTrust: "-2", juneTrust: "-5" }, log: "You offered June to Voss to spare the farm.", next: "trade_june", when: { juneTrust_lt: 0, juneAlive: true } },
      ],
    },
    ellis_down: {
      kind: "talk",
      arena: "roadblock",
      lines: [
        { speaker: "Ellis", text: "I'm not your friend. I'm on the left so the kid has somewhere to stand that isn't you. Don't dress it up." },
        { speaker: "Voss", text: "Fine. The mechanic's soft. I'm not. Half the corn, or I start with the porch." },
      ],
      next: "voss_deal",
    },
    voss_deal: {
      kind: "talk",
      arena: "roadblock",
      lines: [
        { speaker: "June", text: "He's still a man with trucks.", when: { juneAlive: true } },
      ],
      choices: [
        { text: "Half the seed corn. You leave the people and the gate.", set: { voss: "parley", sparedVoss: true, calTrust: "+1" }, log: "You gave Voss half the seed corn.", next: "after_parley" },
        { text: "No.", set: { voss: "fight" }, log: "You refused Voss.", next: "fight_raiders" },
        { text: "Just you and me. They stay back.", set: { voss: "duel" }, log: "You offered Voss a single fight.", next: "fight_duel" },
        { text: "Take the girl and leave the farm. You hear yourself say it. You do not take it back.", set: { juneAlive: false, voss: "trade", calWith: false, calTrust: "-2", juneTrust: "-5" }, log: "You offered June to Voss to spare the farm.", next: "trade_june", when: { juneTrust_lt: 0, juneAlive: true } },
      ],
    },
    after_parley: {
      kind: "talk",
      arena: "roadblock",
      lines: [
        { speaker: "Voss", text: "Corn in the beds. We leave the gate standing. If I see you on my road with that sword hungry, I won't make a speech." },
        { speaker: "Owen", text: "We'll eat shorter. We'll eat. I can hate you and still count the sacks." },
        { speaker: "Ellis", text: "Don't wait up.", when: { ellisExit: "voss" } },
        { speaker: "Cal", text: "You bought a morning. Mornings are not cheap. They're still mornings.", when: { calWith: true } },
      ],
      next: "river",
    },
    fight_raiders: {
      kind: "combat",
      arena: "roadblock",
      tip: "Living people shoot. The streak is slow if you move. Closing in makes them use a knife.",
      spawn: (s) => {
        const list = [
          { type: "raider", count: 2 },
          { type: "raider", count: 1, name: "Voss", id: "voss", hp: 100 },
        ];
        if (s.ellisRaider) list.push({ type: "raider", count: 1, name: "Ellis", id: "ellis", hp: 64 });
        return list;
      },
      next: "after_raiders",
    },
    after_raiders: {
      kind: "talk",
      arena: "roadblock",
      lines: [
        { text: "The trucks tick as they cool. Nobody is going to call this a victory out loud." },
        { speaker: "Owen", text: "The corn stays. So do the bodies. I know which one the crows will argue about." },
        { speaker: "June", text: "Ellis ran the wrong way and then he stopped.", when: { ellisExit: "dead" } },
        { speaker: "Ellis", text: "I kept her behind the truck. That's the sentence. Don't add to it.", when: { ellisWith: true, ellisAlive: true } },
        { speaker: "Cal", text: "I will bury the ones who still have faces. I won't ask you to help.", when: { calWith: true } },
      ],
      next: "river",
    },
    fight_duel: {
      kind: "combat",
      arena: "roadblock",
      spawn: [{ type: "raider", count: 1, name: "Voss", id: "voss", hp: 120 }],
      next: [
        { when: { ellisRaider: true }, id: "after_duel_ellis" },
        { id: "after_duel" },
      ],
    },
    after_duel: {
      kind: "talk",
      arena: "roadblock",
      lines: [
        { text: "Voss drops the way a man drops, which is worse than the other kind because the sword knows the difference." },
        { speaker: "Owen", text: "One body. The corn stays. I don't know if that's the trade you think it is." },
        { speaker: "June", text: "You didn't have to make it a show. You did it anyway.", when: { juneAlive: true } },
      ],
      next: "river",
    },
    after_duel_ellis: {
      kind: "talk",
      arena: "roadblock",
      onEnter: { ellisRaider: false, ellisExit: "fled", ellisWith: false },
      log: "Ellis saw Voss fall and took the road.",
      lines: [
        { speaker: "Ellis", text: "I'm not next. Remember that you made a show." },
        { text: "He takes the road. He doesn't take a truck. That feels like a kind of honesty." },
      ],
      next: "river",
    },
    trade_june: {
      kind: "talk",
      arena: "roadblock",
      lines: [
        { speaker: "Voss", text: "I don't steal children. I take what a place puts on the table. Remember who set the table." },
        { speaker: "Owen", text: "Get the sword off my farm. The corn can stay. I will not say her name so you can feel it." },
        { speaker: "Cal", text: "I won't walk behind that. Don't follow me and call it penance." },
      ],
      next: "after_trade",
    },
    after_trade: {
      kind: "talk",
      arena: "roadblock",
      lines: [
        { text: "The trucks leave. The left side of you is only air." },
        { text: "Nobody loads a gun. They don't have to." },
      ],
      next: "river",
    },
    river: {
      kind: "talk",
      arena: "farm",
      place: "Miller's gate",
      lines: [
        { text: "The argument happens at the gate because every road is visible from it, and nobody wants to turn their back first." },
        { speaker: "June", text: "Brier Street. I'm not asking you to promise he's alive. I'm asking you not to make me go alone.", when: { juneAlive: true, toldThomas: true, juneTrust_gte: 1 } },
        { speaker: "June", text: "I know the way. I don't know if I know you.", when: { juneAlive: true, juneTrust_lt: 2, toldThomas: true } },
        { speaker: "Cal", text: "There's a signal past the bridge. A voice that still knows street names. I want to hear which names.", when: { calWith: true } },
        { speaker: "Ellis", text: "Signals are how you starve pretty. The gate is ugly and it eats.", when: { ellisWith: true } },
        { speaker: "Owen", text: "If you stay, you take a watch like a person, not a weapon that sleeps in the yard.", when: { ruthAlive: true } },
        { speaker: "Owen", text: "Stay if you're staying to bury mornings. Don't stay to be thanked.", when: { ruthAlive: false } },
        { text: "The bridge is already full of the other argument. The one that doesn't use words.", when: { juneAlive: false } },
      ],
      choices: [
        { text: "Stay. Put the sword by the door and take a watch.", set: { road: "stay" }, log: "You chose to stay at Miller's.", next: "walk_bridge", when: { ruthAlive: true } },
        { text: "Stay anyway. Someone has to bury the morning.", set: { road: "stay" }, log: "You stayed at a farm that already broke.", next: "walk_bridge", when: { ruthAlive: false } },
        { text: "Take June and look for Thomas on Brier Street.", set: { road: "brother" }, log: "You chose June's road toward Brier Street.", next: "walk_bridge", when: { juneAlive: true, juneTrust_gte: 2, toldThomas: true } },
        { text: "Go with Cal toward the signal.", set: { road: "signal" }, log: "You chose Cal's signal past the water.", next: "walk_bridge", when: { calWith: true, calTrust_gte: 1 } },
        { text: "Leave before anyone can follow.", set: { road: "alone" }, log: "You left before anyone could follow.", next: "walk_bridge" },
      ],
    },
    walk_bridge: {
      kind: "explore",
      card: "The Water",
      kicker: "Day 11, evening",
      arena: "bridge",
      marker: "span",
      hint: "The bridge is a dark bone over the water. They are already on it.",
      spawn: [{ type: "shambler", count: 2, ambient: true }],
      next: "pre_bridge",
    },
    pre_bridge: {
      kind: "talk",
      arena: "bridge",
      lines: [
        { text: "They heard the sword, or they heard the living. It doesn't matter which rumor was faster." },
        { speaker: "June", text: "Left side. Like the first time. Don't miss.", when: { juneAlive: true, juneTrust_gte: 1 } },
        { speaker: "June", text: "I'll be behind you. Not close.", when: { juneAlive: true, juneTrust_lt: 1 } },
        { speaker: "Ellis", text: "Edge looks honest. Try to be.", when: { ellisWith: true, sharpened: true } },
        { speaker: "Ellis", text: "That edge catches. You know it. Don't saw on my account.", when: { ellisWith: true, sharpened: false } },
        { speaker: "Cal", text: "If I fall, don't make it a sermon. Make it quick.", when: { calWith: true } },
        { text: "Voss's rifle takes one at the knee out on the span. He does not look at you. A deal is a deal, even an ugly one.", when: { voss: "parley" } },
      ],
      next: "fight_bridge",
    },
    fight_bridge: {
      kind: "combat",
      arena: "bridge",
      spawn: (s) => {
        const shambler = 6 + (s.ruthAlive ? 0 : 2) + (s.stranger === "cut" ? 1 : 0);
        const runner = s.voss === "parley" ? 1 : 2;
        return [
          { type: "shambler", count: shambler },
          { type: "runner", count: runner },
          { type: "brute", count: 1 },
        ];
      },
      next: "ending",
    },
    ending: { kind: "ending", arena: "bridge" },
  };

  const DAY_TEN = {
    walk_school: 1, school_door: 1, fight_gym: 1, school_paper: 1, after_paper: 1,
    walk_farm: 1, farm_gate: 1, ruth_talk: 1, sam_truth: 1, meds: 1, after_meds: 1,
    night_talk: 1, fight_fence: 1,
  };
  const DAY_ELEVEN = {
    morning: 1, after_morning: 1, walk_voss: 1, voss_talk: 1, ellis_down: 1, voss_deal: 1,
    after_parley: 1, fight_raiders: 1, after_raiders: 1, fight_duel: 1, after_duel: 1,
    after_duel_ellis: 1, trade_june: 1, after_trade: 1, river: 1, walk_bridge: 1,
    pre_bridge: 1, fight_bridge: 1, ending: 1,
  };

  function dayOf(id) {
    if (DAY_ELEVEN[id]) return 11;
    if (DAY_TEN[id]) return 10;
    return 9;
  }

  function withYou(s, id) {
    if (id === "june") return !!s.juneAlive;
    if (id === "ellis") return !!(s.ellisWith && s.ellisAlive);
    if (id === "cal") return !!s.calWith;
    return false;
  }

  function lineFor(s, id, why) {
    const place = s.lastFall || s.place || "the road";
    if (id === "june") {
      if (why.down && why.fall) return "You fell at " + place + ". So did I. I can walk. I won't stand in another fight until the day turns.";
      if (why.down) return "I went down at " + place + ". I can walk. I won't stand in another fight until the day turns.";
      if ((s.juneTrust || 0) < 0) return "You fell at " + place + ". I saw it from back where you left me.";
      return "You went down at " + place + ". I stayed on the left. The edge sounds different now.";
    }
    if (id === "ellis") {
      if (why.down && why.fall) return "You fell at " + place + ". I did too. The wrench stays down until the day turns.";
      if (why.down) return "The wrench is done for today. I'll walk. I won't swing until the day turns.";
      return "You hit the ground at " + place + ". I heard the edge take it.";
    }
    if (why.down && why.fall && why.pull) return "You fell at " + place + ". I put my hands on one of them, and then I went down. I can't do either again until the day turns.";
    if (why.down && why.fall) return "You fell at " + place + ". I went down in the same hour. I can't pull another one off you until the day turns.";
    if (why.down && why.pull) return "I put my hands on one of them and then I went down. I can't do that again until the day turns.";
    if (why.down) return "I can't stand in another fight until the day turns.";
    if (why.fall && why.pull) return "You fell at " + place + ". Before that I put my hands on one of them. Neither one was a prayer.";
    if (why.pull) return "I put my hands on one of them. Don't thank me. It wasn't a prayer.";
    return "You fell at " + place + ". I won't bless it, and I won't pretend I didn't see.";
  }

  function writePending(s, id) {
    if (!withYou(s, id)) return;
    const down = (s[id + "Down"] || 0) === (s.day || 9) && s[id + "DownTold"] !== (s.day || 9);
    const fall = !!s.mentionFall;
    const pull = id === "cal" && !!s.mentionPull;
    if (!down && !fall && !pull) {
      if (s.pending) delete s.pending[id];
      return;
    }
    if (!s.pending) s.pending = {};
    s.pending[id] = {
      speaker: { june: "June", ellis: "Ellis", cal: "Cal" }[id],
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
        ? "You fell again at " + place + ". You stood back up. The edge kept another nick."
        : "You fell at " + place + ". You stood back up in the same hour. The edge kept a nick.");
      ["june", "ellis", "cal"].forEach((id) => writePending(s, id));
      return;
    }
    if (kind === "down" && who) {
      s[who + "Down"] = s.day || 9;
      const name = { june: "June", ellis: "Ellis", cal: "Cal" }[who];
      s.journal.push(name + " went down at " + (s.place || "the road") + ". No fight until the day turns.");
      writePending(s, who);
      return;
    }
    if (kind === "pull") {
      s.mentionPull = true;
      s.journal.push("Cal pulled a body off you. He looked at his hands after.");
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
    if (line.down) s[id + "DownTold"] = s.day || 9;
    delete pending[id];
    if (line.fall && !Object.values(pending).some((item) => item.fall)) s.mentionFall = false;
    if (line.pull) s.mentionPull = false;
  }

  function onEnter(id, s) {
    const nextDay = dayOf(id);
    const prev = s.day || 9;
    if (nextDay > prev) {
      if (s.juneAlive && s.juneDown === prev) s.journal.push("The day turned. June can stand in a fight again.");
      if (s.ellisWith && s.ellisAlive && s.ellisDown === prev) s.journal.push("The day turned. Ellis will swing the wrench again.");
      if (s.calWith && s.calDown === prev) s.journal.push("The day turned. Cal can stand close in a fight again.");
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
      s.juneTrust -= 1;
      s.journal.push("June found the note about Thomas in your coat.");
    }
    if (id === "morning" && s.ellisWith && s.ellisAlive && s.juneTrust < 1 && !s._ellisSoften) {
      s._ellisSoften = true;
      s.juneTrust += 1;
      s.journal.push("June saw Ellis hold the line. Some of the cold left the air.");
    }
  }

  function band(n) {
    if (n >= 2) return "close";
    if (n >= 1) return "with you";
    if (n >= 0) return "here, not held";
    if (n >= -1) return "strained";
    return "far";
  }

  function relations(s) {
    let june = !s.juneAlive
      ? "June is gone. The road does not give her back."
      : "June is " + band(s.juneTrust) + ".";
    if (s.juneAlive && s.juneDown === s.day) june += " She will not fight again until the day turns.";
    let ellis = "Ellis Ward is not in your shadow.";
    if (s.ellisExit === "dead") ellis = "Ellis is dead on the roadblock. The cooler isn't why, and it is.";
    else if (s.ellisExit === "voss") ellis = "Ellis left with Voss's trucks.";
    else if (s.ellisExit === "fled") ellis = "Ellis saw the duel and took the road alone.";
    else if (s.ellisWith && s.ellisAlive) {
      ellis = "Ellis is " + band(s.ellisTrust) + ".";
      if (s.ellisDown === s.day) ellis += " The wrench is down until the day turns.";
    }
    else if (s.robbed) ellis = "You took his food. He remembers the weight.";
    let cal = !s.calWith ? "Cal is on some other road." : "Cal is " + band(s.calTrust) + ".";
    if (s.calWith && s.calDown === s.day) cal += " He will not stand in another fight until the day turns.";
    const edge = s.sharpened || (s.bladeWear || 0) < 0.08
      ? "The edge is honest."
      : (s.bladeWear || 0) < 0.3
        ? "The blade still bites clean, mostly."
        : "The edge catches. You have to mean it twice.";
    return [june, ellis, cal, edge];
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
    if (s.harris === "quiet") bits.push("June still counts under her breath when a door sticks. She got to eighty-seven once. She has not told you what number she is on now.");
    else if (s.harris === "told") bits.push("Harris looked at June because you made him. She kept the picture. You said you would carry it" + (s.carriedPaid ? ", and for one hour, you did." : ". Some hours you didn't."));
    else if (s.harris === "turned") bits.push("Harris turned in the back seat after you bought miles with a towel. June was in the front. She had already told you.");
    if (s.hidThomas) bits.push("Thomas Pell's name rode in your coat until June took it back. Brier Street did not get any closer for the hiding.");
    else if (s.asked) bits.push("You let June say Thomas's name before the paper did. Eleven years old. One shoe on, even in sleep. Brier Street.");
    else if (s.toldThomas) bits.push("You put the pickup list in her hand without a speech. She filled the silence herself.");
    if (s.meds === "ruth") bits.push("Ruth Miller saw the morning. Sam Ibarra didn't. The bottle was honest about only having one name in it.");
    else if (s.meds === "sam") bits.push("Sam ate. Ruth didn't. Owen runs the names now, and he does not make them prettier.");
    else if (s.meds === "kept") bits.push("The bottle stayed in your coat. The porch learned the sound of it. Two people didn't see morning.");
    if (s.ellisExit === "dead") bits.push("Ellis Ward stopped on the asphalt between a truck and a wrench. The peaches were the start of that sentence, not the end.");
    else if (s.ellisExit === "voss") bits.push("Ellis went with the trucks. He nodded once, like a debt he didn't intend to pay in front of you.");
    else if (s.ellisWith) bits.push("Ellis walks where the work is. He still calls the katana a long way to bring a kitchen knife, and then he stands on the loud side.");
    else if (s.robbed) bits.push("Somewhere a mechanic is still angry about peaches. You know the weight of the can.");
    if (s.stranger === "cut") bits.push("A woman in a shouldered car does not have a name in your mouth. Cal walked that road and called the work a blessing with dirt on it.");
    else if (s.stranger === "left") bits.push("You left a woman tapping on the glass. The tapping outlasted the overpass.");
    if (s.voss === "parley") bits.push("Half the seed corn bought a gate. Voss kept his word the way a knife keeps an edge: useful, not warm.");
    else if (s.vossDead) bits.push("Voss is a body with a whole name and no softer one. The corn stayed. So did the shape of the fight.");
    else if (s.voss === "trade") bits.push("The table was yours. Voss only took what you set on it.");
    if (s.hour === "sharpen") bits.push("You spent the quiet hour on the edge. It shows. So does everything you didn't say.");
    else if (s.swordDown) bits.push("You put the sword in the dirt and the dirt did not keep it. You picked it up when the trucks came.");
    else if (s.hour === "food") bits.push("June said the peaches tasted like a door shut soft. You didn't ask her to thank you.");
    if (s.gaveCar) bits.push("Nedra has the car. You learned the length of a mile with your feet.");
    if ((s.falls || 0) > 0) {
      const dull = !s.sharpened && (s.bladeWear || 0) >= 0.08;
      const once = s.falls === 1;
      bits.unshift(once
        ? "You fell once and stood up in the same hour. " + (dull ? "The edge kept the nick." : "The stone took the nick back.") + " The roads did not move for it."
        : "You fell more than once and stood up in the same hour. " + (dull ? "The edge kept every nick." : "The stone took the nicks back.") + " The roads did not move for it.");
    }
    return bits.slice(0, (s.falls || 0) > 0 ? 6 : 5);
  }

  function ending(s) {
    const type = endingOf(s);
    const mem = memories(s);
    const closings = {
      door: [
        "In the morning the sword is by the door, where boots can see it. June steps over it without counting. Someone on the fence calls your name like it is a job.",
        "You answer. That is the whole mercy available on this farm, and you take it with dirty hands.",
      ],
      thin: [
        "You stay. The farm is a handful of people who flinch when the sword passes a doorway. Owen counts cans and does not count on you for stories.",
        "The gate holds. Holding is not the same as healing. You take the watch anyway, because leaving would ask for a witness you no longer deserve.",
      ],
      june: [
        "You do not promise her that Thomas is alive. She does not ask you to. The farm gets small behind you. She walks on your left.",
        "Brier Street is a direction, not a pardon. The sword is heavy in the ordinary way. For now, that is enough road.",
      ],
      signal: [
        "Cal holds the radio like a bowl. A voice says a street you know. You tell him the truth of that street, or you don't, and he nods as if a fact can be sat with.",
        "The water takes the county road back. You keep walking toward a voice because a voice is a kind of person until it isn't.",
      ],
      ash: [
        "No one is behind you. You check anyway. The blade is bright at the work and useless at talking.",
        "Harrow Creek closes like a mouth. You keep walking because stopping would require a witness.",
      ],
      trade: [
        "The corn stays. The watch changes. Nobody stands on your left. Owen will not say her name, and you will not make him.",
        "At night the gate holds. You are the thing it cost.",
      ],
    };
    const titles = {
      door: "The Door",
      thin: "The Thin Gate",
      june: "June's Road",
      signal: "The Signal",
      ash: "Ash",
      trade: "What You Traded",
    };
    return {
      type,
      title: titles[type],
      kicker: "Day 11  —  " + (s.name || "Mara"),
      paragraphs: mem.concat(closings[type]),
    };
  }

  function createState(name) {
    const clean = String(name || "Mara").replace(/[<>]/g, "").trim().slice(0, 18) || "Mara";
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
      day: 9,
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
      journal: ["Day 9. The dojo still smells like floor wax and the dead."],
      hp: 100,
      place: "Harrow Creek",
      node: "",
      _did: {},
      _wear: 0,
    };
  }

  root.Story = { NODES, match, apply, fill, resolve, onEnter, relations, ending, createState, dayOf, remember, readyLines, hear };
})(window);
