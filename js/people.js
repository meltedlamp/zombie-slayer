(function (root) {
  const PEOPLE = [
    {
      id: "you",
      group: "Family",
      name: "{name}",
      role: "The one they call",
      said: "Sharpen the edge, warm the spine, don't grind the groove.",
      text: [
        "Saturday class taught you the sword. You left it in the school trophy case, with a care card taped behind a tag in your own handwriting. On day three the case is still shut, and what you have is a pipe and a short knife.",
        "Mom called at noon. She has Leo. They are going to the army checkpoint on the river bridge, and she told Mia to find you and not to go with anyone else. Mia walks on your left, away from the swing. The dead are already practicing your name.",
      ],
    },
    {
      id: "mia",
      group: "Family",
      name: "Mia",
      role: "Sister, thirteen",
      said: "Mom said find {name}. Then we go to the bridge. She has Leo. I'm not going with anybody else.",
      text: [
        "She made it to the community center because Mom told her to. She knows the school door she is late through, and how the handle sticks: pull up, then in. She is thirteen. She will not sit where she cannot see, and she will not pretend a person didn't die.",
        "She stays on your left. If you hide a bite, a note, or a name, she hears it anyway. The bridge is still the plan. She is not asking you to promise that Leo is alive. She is asking you not to make her walk it alone.",
      ],
    },
    {
      id: "leo",
      group: "Family",
      name: "Leo",
      role: "Brother, eight",
      text: [
        "Mom has him. That is the last sure thing. He is eight, and the detail Mia keeps is that he sleeps with one shoe on. A note in a teacher's fast hand, left on the trophy case, says they were going to the army bridge and they did not leave her. The same words are scratched into the glass from the inside, and the scratches are older than the paper.",
        "You have not seen him since the phones died. Other mouths have. A woman in a car uses his voice. The dark is already studying a boy who is not there to answer.",
      ],
    },
    {
      id: "mom",
      group: "Family",
      name: "Mom",
      role: "On the road to the bridge",
      text: [
        "She called at noon on day three, in her own ringtone, and said she had Leo. Then the same ring started in the parking lot, where nobody living was holding a phone. After that her voice turns up warm and exact: in the lot, in a back seat, on a school speaker, on the bridge loudspeaker.",
        "Sometimes it gets as far as a name. Sometimes it laughs with no air in it. If she is at the checkpoint, you will see her. If she is not, the voice will keep her anyway.",
      ],
    },
    {
      id: "uncle",
      group: "Family",
      name: "Uncle Ray",
      role: "Day one, on the phone",
      text: [
        "He called on the first day. He still sounded like himself, which on day one was still possible. The family hung up to save the battery. Mia says Ben sounds like him. That is all the road has given back.",
        "You do not know which room he is in, or whether the thing that answers a phone now would use his hello. A hung-up call is not the same as a goodbye. He is not the Ray who watches the left side of Walsh Farm.",
      ],
    },
    {
      id: "dean",
      group: "The road",
      name: "Dean",
      role: "Next door",
      said: "Sorry. It's the ankle. I'm still me. I swear I'm still me.",
      text: [
        "He lives next door. He came into the community center to charge a phone, and he wants the side lot because it still looks empty. He did not sign up to walk Mia through the dead. His hands shake when the keys are put in them.",
        "The bite is on the ankle. It keeps moving after the foot stops. He says he caught it on the door. He says he will tell you if it changes. When it changes, he repeats Mia's sentences from the center, a little late, and the smile stays after the words are finished, like he forgot how to put it away.",
      ],
    },
    {
      id: "rico",
      group: "The road",
      name: "Rico",
      role: "The pumps",
      said: "Cooler's mine. Peaches and beans. I'm saying that before anybody gets brave.",
      text: [
        "He works the station. The pumps are dead. He is not. On day one he had a full tank and gave three rides. The fourth person bit the driver, so he will not do another ride unless he comes with the car. The bathroom door has been opening by itself. He says not to look in there.",
        "He can hear when a pipe has already been used. In a fight he takes the loud side and keeps Mia where she can see a person who is not swinging. He is not interested in being called a friend. He stays for the work, and he says so without dressing it up. The wrench is his.",
      ],
    },
    {
      id: "nora",
      group: "The road",
      name: "Nora",
      role: "The van",
      said: "I'm Nora. That's my brother Ben. He's bitten. He can still talk. I can't do it.",
      text: [
        "She is in a van with her brother. He is bitten, and he can still talk, and she cannot do the thing he is asking. She tells you her name before she tells you anything else, and she points at him so you do not have to guess which one is already going.",
        "There is water in the blue jug. She says not to look in the back of the van. If the car is put in her hands, she says she will not waste the gas, and that she has been shown she has to be the one, if it comes to it.",
      ],
    },
    {
      id: "ben",
      group: "The road",
      name: "Ben",
      role: "Nora's brother",
      said: "Don't let me turn. Nora won't say it. I'm saying it. Do it while I still know her.",
      text: [
        "Bitten, and still talking, which Sam counts as still here. He wants it done while he still knows his sister. He does not want Nora to have to learn how. He looks at her like he is memorizing how to be her brother.",
        "His fingers tap the van floor. He does not look at them. Outside, the dead tap the same beat back. He says they are learning the song. If he starts singing it, he tells you not to wait for him to finish. Even a thank-you can come out, for half a second, in his sister's voice. He hears it. He nods so you will not hesitate.",
      ],
    },
    {
      id: "sam",
      group: "The road",
      name: "Sam",
      role: "Paramedic",
      said: "If he's still talking, he's still here. I'll stay either way.",
      text: [
        "He was a paramedic. He says it in the past tense and then does the job anyway. If a person is still talking, Sam will not call them gone. In a fight he stays low and pulls bodies off the living. If he falls, he does not want a speech. He wants it quick.",
        "He is going where there are still living people. That can be your road, or a different one. Past the bridge he has heard a radio that still says street names. Under the names, if you listen too long, is a laugh with no air in it.",
      ],
    },
    {
      id: "woman",
      group: "The road",
      name: "The woman in the car",
      role: "The shoulder",
      text: [
        "Nobody on the road gives her a name. A car sits half on the shoulder of the highway. She stops hitting the glass when she sees Mia, and she smiles with too many teeth. In a little boy's voice she says Mom is at the bridge. Then her jaw slips, and the voice keeps going without the mouth.",
        "She does not know Leo. She has him anyway. Breaking the glass is loud. Leaving her means she goes back to tapping, and between taps she practices Mia's name until the shape of it is right.",
      ],
    },
    {
      id: "dale",
      group: "Walsh Farm",
      name: "Dale Walsh",
      role: "The gate",
      said: "Sword in the dirt before you talk.",
      text: [
        "Last roof before the bridge. He meets you with a rifle, and he wants the sword in the dirt before anyone talks. His mother Helen is in the house. She is sick. She still knows everybody's name, and he talks about that the way other people talk about a fence.",
        "He counts sacks. He runs the watch. If a choice is wrong, he says you will say it at breakfast, because the house does not hide it. He will not thank you for a hard morning, and he will not dress a report up into something kinder than what happened.",
      ],
    },
    {
      id: "helen",
      group: "Walsh Farm",
      name: "Helen Walsh",
      role: "The house",
      said: "One bottle. If you split it, you waste it. I've done the math. I hate the math.",
      text: [
        "Dale's mother. The sickness is a dirty cut, not a bite, and she will say the difference before anyone gets brave with a theory. There is one bottle of real antibiotics. The date is old. It is all they have.",
        "She does not need a speech. She needs a decision, said out loud, where the house can hear it. Jonah from next door is in the side room with a fever, and she will not pretend the bottle can be two bottles. In the morning she still gives orders, if the morning still has her in it.",
      ],
    },
    {
      id: "jonah",
      group: "Walsh Farm",
      name: "Jonah",
      role: "Next door, eight",
      said: "Don't go to the bridge. She's already waiting there.",
      text: [
        "He sits behind Leo at assembly. He cried at the fire drill. That is all Mia knows, and she will not let you talk about him like a number on a bottle. He is eight. He is in the side room at Walsh Farm with a fever. Nobody saw a bite. Nobody looked hard enough to swear.",
        "His sleeve is damp where somebody already checked, or pretended to. He looks at you, a person he has never met, and tells you not to go to the bridge. Then he blinks, asks for water, and does not remember saying anything.",
      ],
    },
    {
      id: "ray",
      group: "Walsh Farm",
      name: "Ray",
      role: "The left side of the fence",
      said: "Left side's mine. You take the gate.",
      text: [
        "He takes the left side of the Walsh fence and gives you the gate. If the gate holds until morning, he tells you not to put your name on that. He is a pair of hands on a watch, not a story he wants told back to him.",
        "He is not Uncle Ray. Uncle Ray was a voice on day one, hung up to save a battery. This Ray is still in the yard, for as long as the yard is still a yard.",
      ],
    },
    {
      id: "kane",
      group: "The block",
      name: "Kane",
      role: "The trucks",
      said: "Kane. That's the whole name. Don't look for a softer one.",
      text: [
        "Two trucks stop where the corn can hear them, between the farm and the bridge. He wants half the food. The people, the well, and the road would stay. His trucks would not burn the place. He gives one name and tells you not to look for a softer one.",
        "He talks like a deal is a kind of fence. He does not steal children. He takes what a place puts on the table, and he wants the person who set it to remember that they did. If he sees the sword pointed at his people after a bargain, he will not talk the next time.",
      ],
    },
    {
      id: "dead",
      group: "The dark",
      name: "The dead",
      role: "What is learning you",
      text: [
        "A bite does not get better. The skin crawls. The voice arrives before the body is finished changing. They stand in parking lots, school buses, corn, and on the span of the bridge, and they practice. A name, said warm. A ringtone. A song tapped on a van floor and answered from the trees.",
        "They are not only hungry. They are getting better at being someone you will turn toward. A bus full of small hands mouths your name like a lesson. A loudspeaker laughs with no air in it. The corn can say Mom the way she said it when she was only calling you in for dinner. You do not answer that one.",
      ],
    },
  ];

  if (root.Story) root.Story.people = PEOPLE;
})(window);
