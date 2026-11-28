/**
 * What the thinkers make of your two choices in each thought experiment,
 * written in advance for every combination (23 experiments × 4). Used when
 * you give no "why" of your own; when you do, the reply is written live so
 * it can answer your words.
 *
 * The key is your first answer then your answer to the twist: 'a' is the
 * first choice offered, 'b' the second. So 'ab' means you took the first
 * option, then the second option after the twist.
 */
export interface Reaction {
  reading: string
  reactions: { philosopherId: string; text: string }[]
  question: string
}
type Combo = 'aa' | 'ab' | 'ba' | 'bb'

const r = (reading: string, a: [string, string], b: [string, string], question: string): Reaction => ({
  reading,
  reactions: [
    { philosopherId: a[0], text: a[1] },
    { philosopherId: b[0], text: b[1] },
  ],
  question,
})

export const REACTIONS: Record<string, Record<Combo, Reaction>> = {
  trolley: {
    aa: r(
      'You followed the numbers both times: five lives outweigh one, whether you pull a lever or push a man.',
      ['bentham', 'Consistent, and correct. The man on the bridge feels different only because the harm is close and physical. Feelings are not arguments: five people’s happiness is five times one.'],
      ['kant', 'You treated a man as a tool, a weight to stop a trolley. The lever redirects a threat; the push uses a person. That difference is everything, and the numbers cannot see it.'],
      'If the numbers are all that matter, is there anything you would never do to one person to save many?',
    ),
    ab: r(
      'You would pull the lever but not push the man, like most people. Something besides the numbers is guiding you.',
      ['thomson', 'You share the puzzle that kept me busy for years. The question is not whether you are right to refuse, but whether you can say why, without just pointing at your gut.'],
      ['kant', 'Your refusal is wiser than you may think. Pushing him means using his body as a means to your end. Redirecting a threat does not. Trust that difference.'],
      'What exactly is the difference between pulling the lever and pushing the man?',
    ),
    ba: r(
      'You would not pull the lever, yet you would push the man. That is a rare and surprising pair of answers.',
      ['bentham', 'Then you agree the numbers matter after all. But if five beat one on the bridge, they beat one at the lever too. You cannot have it both ways.'],
      ['kant', 'Refusing to choose who dies at the lever, then choosing it with your own hands on the bridge? Ask yourself which of these answers you actually believe.'],
      'What made you willing to act on the bridge when you were not willing at the lever?',
    ),
    bb: r(
      'You refused both times. For you, choosing who dies is not yours to do, whatever the numbers.',
      ['kant', 'You keep your hands clean of using anyone, and you respect each life as more than a number. That is not weakness. It is refusing to make yourself the judge of who may be sacrificed.'],
      ['bentham', 'Clean hands, and four more funerals. Not acting is also a choice, and here it costs four lives. I cannot call that the moral answer.'],
      'Is letting five die by doing nothing really different from causing one death?',
    ),
  },

  theseus: {
    aa: r(
      'For you, a thing is what continues: the ship in service is the ship of Theseus, however many planks change.',
      ['hume', 'Exactly how the mind works. Gradual change and a continuing purpose let us call it “the same”. The sameness is in how we see it, not in the wood.'],
      ['hobbes', 'Then answer me this: if the owner sued to get his ship back, which would the court give him? “The same” has more than one meaning, and you have chosen one.'],
      'Are you the same person you were as a small child, even though almost everything about you has changed?',
    ),
    ab: r(
      'At first continuity mattered to you, but once the old planks came back together, the original material won.',
      ['hobbes', 'You have found the trap I set. Both answers pull at us, because “same” can mean same matter or same continuing thing. Neither is simply wrong.'],
      ['parfit', 'Notice that nothing changed about the ship in service, only what else exists. If identity can depend on something happening elsewhere, perhaps it matters less than we thought.'],
      'If you could only keep one, your memories or your body, which would make you still you?',
    ),
    ba: r(
      'You thought it became a new ship, yet when two existed you chose the one still sailing.',
      ['hume', 'You are wavering, and that is honest. The mind feels the pull of both answers because “the same” is a habit of thinking, not a fact waiting to be discovered.'],
      ['parfit', 'Your answers suggest the question may be empty. Everything about the situation is known. Asking which is “really” the ship adds no new fact.'],
      'Could some questions have no true answer, even when we know every fact?',
    ),
    bb: r(
      'For you, a thing is its material. Replace the planks and you have a new ship; gather them again and the original returns.',
      ['hobbes', 'A clear and consistent view. But by it, you yourself are not the person you were years ago, since your body’s matter has been replaced too. Are you ready for that?'],
      ['hume', 'You trust the wood over the story. Yet no one points at a pile of planks and calls it a ship. What made them Theseus’s ship was their use, not only their substance.'],
      'If every cell in your body is replaced over the years, what makes you still you?',
    ),
  },

  'experience-machine': {
    aa: r(
      'You would plug in, and once inside, you would still choose the truth. You want good feelings, but not at the price of a lie.',
      ['nozick', 'Interesting: you accept the machine, then refuse to stay in one. Perhaps you care more about reality than you first thought. Most of us want to actually do things, not just feel them.'],
      ['mill', 'Your second answer is the wiser. Better to be a human being dissatisfied than a satisfied illusion. Some goods need contact with the real world.'],
      'If your happiness turned out to rest on something false, would you want to know?',
    ),
    ab: r(
      'You would plug in, and you would stay in. For you, how a life feels is what makes it good.',
      ['bentham', 'Consistent. If pleasure is the only good, a machine that supplies more of it is simply a better life. Your refusal to be squeamish is honest.'],
      ['nozick', 'Then nothing you did in there was done, and no one you loved was there. I wrote this case because I think, deep down, we want more than experiences. Do you really not?'],
      'Would you want the people you love to be real, or only to feel real?',
    ),
    ba: r(
      'You refused to plug in, and when told you were already inside, you chose to unplug. Reality matters to you.',
      ['nozick', 'Exactly my point. We want to actually be a certain kind of person and really do things, not just have the feeling of it. Pleasure cannot be all that matters.'],
      ['bentham', 'Your outside life is lonely and ordinary; your inside one is full of joy. Choosing less happiness for the sake of “reality” looks to me like prejudice dressed as principle.'],
      'What would you lose in a perfect simulation, if it felt exactly the same?',
    ),
    bb: r(
      'You refused to plug in, but once you were inside, you chose to stay. Starting a life of illusion and leaving one feel different to you.',
      ['nozick', 'Your answers reveal something important: much of our resistance to the machine may be about the life we already have. We cling to what we know, wherever it is.'],
      ['mill', 'You may have discovered that the lonely real life has little to offer. Then the answer is not the machine, but making the real world give people more.'],
      'Is it the truth you value, or the life you already have?',
    ),
  },

  veil: {
    aa: r(
      'You chose the bigger, richer society, and kept your choice when you learned you would probably do well.',
      ['bentham', 'A sound choice. More total wealth means more total happiness, and you did not let your own position decide it. That is impartial reasoning.'],
      ['rawls', 'But behind the veil you might be the one at the bottom, with nothing to fall back on. Would you really gamble your whole life on landing well?'],
      'If you ended up in the worst position in your chosen society, could you accept that it was fair?',
    ),
    ab: r(
      'You chose the bigger society, but once you knew you would probably be near the top, you changed your mind.',
      ['rawls', 'That is exactly why the veil must stay down. As soon as people know where they will stand, their choices bend towards themselves. Justice needs ignorance of our own luck.'],
      ['nozick', 'Changing your answer once you knew more is not shameful. But notice how odd it is to design a whole society for people who know nothing about themselves.'],
      'Should knowing your own place change what you think is fair?',
    ),
    ba: r(
      'You chose the society with a floor no one falls below, and stood by it even knowing you would probably do well.',
      ['rawls', 'This is the choice I believe reasonable people would make. You protected the worst-off position because it might have been yours, and you did not abandon them once you were safe.'],
      ['nozick', 'Generous. But who pays for that floor? It is built from what others have earned. A fair society, to me, is one where what people acquired fairly is theirs to keep.'],
      'Would you still choose the floor if you were the one paying most for it?',
    ),
    bb: r(
      'You chose the safe floor at first, but once you learned you would likely be near the top, you switched to the richer society.',
      ['rawls', 'Then your first answer was the fair one, and your second was luck speaking. That is why I asked people to choose before they know where they will land.'],
      ['bentham', 'You followed the expected happiness, which is not unreasonable. But be honest that it is your happiness, not everyone’s, you were now counting.'],
      'Is a choice still fair if you would only make it because it suits you?',
    ),
  },

  gyges: {
    aa: r(
      'You say you would stay honest with the ring, yet you would take money for someone you love. Love bent the rule where nothing else could.',
      ['plato', 'Your first answer is the one I hoped for. Your second shows how hard it is to hold. Injustice done for love is still injustice, and it changes the soul that does it.'],
      ['hobbes', 'Honest. Most people are just because they fear being caught. Remove the fear and add a good enough reason, and the rules bend, as yours did.'],
      'Is doing wrong for someone you love more forgivable, or just easier to excuse?',
    ),
    ab: r(
      'You would live as you do now, and refuse to steal even for someone you love. For you, honesty does not depend on being watched.',
      ['plato', 'This is the just soul I described. You are honest not for your reputation, but because injustice harms the one who does it. The ring changes nothing for you.'],
      ['hobbes', 'Admirable, and rare. But I would not build a society on the hope that most people are like you. That is why we need laws, and someone to enforce them.'],
      'Would you trust most people with the ring? Why or why not?',
    ),
    ba: r(
      'You admit you would bend some rules with the ring, and you would take the money to help someone you love.',
      ['hobbes', 'You are honest about what most people would do. Justice, without a power over us, is a hope rather than a habit. Your answer is why we need laws.'],
      ['plato', 'Then ask what you would become, year by year, acting unseen. The unjust life looks free, but it corrodes the soul. You would not be happier, only less watched.'],
      'Is someone who is good only when watched really good at all?',
    ),
    bb: r(
      'You would bend some rules with the ring, but you draw the line at stealing, even for someone you love.',
      ['plato', 'So there is a line in you that no ring can erase. Follow it. That line is the beginning of a just soul, and it is worth more than any secret gain.'],
      ['hobbes', 'You will bend small rules but not break a big one. Most people are the same. What decides it is often how much they think the harm will matter.'],
      'Where exactly is your line, and why is it there?',
    ),
  },

  cave: {
    aa: r(
      'You stayed in the light, and you would go back down to free the others, knowing they may turn on you.',
      ['plato', 'This is the duty of the one who sees. Having left the cave, you must return and help, even at great cost. That is why I said philosophers must take part in ruling.'],
      ['socrates', 'I went back, in my way, and Athens laughed, then put me to death. I do not regret it. But be ready: people rarely thank those who disturb their comfortable shadows.'],
      'Is there a truth you would risk being laughed at to tell?',
    ),
    ab: r(
      'You stayed in the light, but you would leave the others below. You chose the truth for yourself, not as a mission.',
      ['nietzsche', 'Good. Why drag the herd into a light they cannot bear? Some are made for the heights. Leave the cave to those who love its shadows.'],
      ['plato', 'You have the truth and keep it to yourself. Then what was it for? Knowledge that does not return to help others is only half of wisdom.'],
      'Do you have any duty to share what you know with people who do not want to hear it?',
    ),
    ba: r(
      'You would go back to the comfort of the cave, yet you think the others deserve to be freed.',
      ['plato', 'Then you know the truth is worth something, or you would not want them to have it. The pain of the light is the price. Perhaps you are readier for it than you think.'],
      ['nietzsche', 'You want the truth for others and comfort for yourself. Be honest about your own fear. The question is whether you can bear what you think others should face.'],
      'Why might the truth feel worth it for others but not for yourself?',
    ),
    bb: r(
      'You would go back to the comfortable cave, and leave the others there too. Familiar shadows feel safer to you than a painful truth.',
      ['nietzsche', 'At least you are honest. Most people choose the comfortable lie and call it wisdom. But ask yourself what you are missing in the dark.'],
      ['plato', 'The shadows are comfortable because they are all you know. But a life spent mistaking shadows for things is a life asleep. I would not wish it on anyone.'],
      'Is there something in your own life you suspect is a comfortable shadow?',
    ),
  },

  'marys-room': {
    aa: r(
      'You think Mary learns something new on seeing red, and that she would even if she could predict her brain’s reaction. Experience, for you, is a kind of knowing no science can replace.',
      ['descartes', 'You have found the gap between the mind and the physical world. The experience of red is in the thinking mind, and no account of matter can contain it.'],
      ['wittgenstein', 'Be careful with “knows what red is like”. What new fact could she state? Perhaps she gained an ability, to recognise and imagine red, rather than a new piece of knowledge.'],
      'Could you explain what red looks like to someone who has never seen it?',
    ),
    ab: r(
      'You thought Mary learns something new, but if her science let her predict everything, you think nothing was left to learn.',
      ['wittgenstein', 'Your second answer shows the first was about surprise, not knowledge. Much philosophy comes from confusing a feeling of discovery with discovering a fact.'],
      ['descartes', 'Predicting a reaction is not having it. Your first answer may have been the wiser one. The mind’s experience is not the same thing as the brain’s workings.'],
      'Is being surprised the same as learning something?',
    ),
    ba: r(
      'You first thought Mary learns nothing new, but if she predicted her own brain’s reaction perfectly, you think she would still learn something.',
      ['descartes', 'Your second answer takes the experience seriously. Knowing every fact about the brain is not the same as seeing red, and you seem to sense this.'],
      ['wittgenstein', 'You have pulled in two directions. That usually means a word, here “learn”, is being asked to do two different jobs at once.'],
      'Is knowing all about something the same as knowing it?',
    ),
    bb: r(
      'For you, Mary learns nothing new. If she knew every physical fact, the experience of red adds no further fact.',
      ['wittgenstein', 'A clear view. Perhaps what she gains is not a fact but a skill, being able to recognise and imagine red. Not every “knowing” is knowing that something is so.'],
      ['descartes', 'Then where is the redness of red in all her physical facts? I suspect you have left out the very thing she was missing: the mind that sees.'],
      'Do you think science could ever fully explain what your experiences feel like?',
    ),
  },

  teleporter: {
    aa: r(
      'You would step in, and you would be upset at dying even with your copy carrying on. Your head says the copy is you; something else disagrees.',
      ['parfit', 'This tension is exactly where my own thinking began. If the one who arrives is you, the one left behind should matter less. Yet the fear remains. Perhaps the fear is the illusion.'],
      ['locke', 'You are, for me, your continuing consciousness and memory. The copy shares your memories, but if you are both alive at once, you cannot both be the same person.'],
      'If there were two of you, which one would be you?',
    ),
    ab: r(
      'You would step in, and you would not be too upset to die with your copy living on. For you, what matters is that your life continues, not this particular body.',
      ['parfit', 'This is the view I came to. What matters is not identity but continuity, memories, plans and character carrying on. Once I saw that, I feared death less.'],
      ['buddha', 'You have glimpsed something true: there is no fixed self to protect. Holding less tightly to “me” loosens fear. But see whether you really feel it, or only think it.'],
      'Which matters more to you, being you, or your life and plans continuing?',
    ),
    ba: r(
      'You would never step in, and you would be upset to die even with your copy carrying on. For you, a copy is not you.',
      ['locke', 'A consistent view. Something unbroken must link the person who goes in and the one who comes out. A copy, however perfect, begins a new life.'],
      ['parfit', 'But ask what is lost that the copy does not have. Same memories, same character, same plans. Perhaps the “you” you are protecting is less solid than it feels.'],
      'What do you think makes you, you, and not a perfect copy?',
    ),
    bb: r(
      'You would never step in, yet you would not be very upset to die if your copy carried on. You fear the machine more than the outcome.',
      ['buddha', 'Your answers show how the fear of losing a self can be stronger than any self we can find. Look closely for the “you” that is at risk. It is hard to find.'],
      ['parfit', 'You seem to agree that what matters continues in the copy. Then the teleporter itself should not frighten you. The fear may be about the moment, not the result.'],
      'Is it death you fear, or the moment of dying?',
    ),
  },

  violinist: {
    aa: r(
      'For you, his life outweighs your freedom, for nine months and for an hour alike. Saving a life comes first.',
      ['singer', 'Consistent and serious. If you can prevent a death at a cost far smaller than a life, you must. Nine months is a great deal, but less than a life.'],
      ['thomson', 'Generous. But does he have a right to your body, or would staying be a great kindness? I argued that no one has a right to use another’s body, even to live.'],
      'Is there a difference between something being kind and it being your duty?',
    ),
    ab: r(
      'You would stay nine months, but for one hour you think it would be kind rather than owed.',
      ['thomson', 'Interesting, almost the reverse of my own intuition. Usually people feel the small cost is owed and the large one is generous. What makes the long stay a duty for you?'],
      ['anscombe', 'Duties do not simply grow and shrink with the cost. Ask what kind of act refusing would be. That, not the number of hours, tells you whether it is wrong.'],
      'Do bigger sacrifices create bigger duties, or smaller ones?',
    ),
    ba: r(
      'Your body is yours to decide about over nine months, but you think refusing a single hour would be wrong.',
      ['thomson', 'This is exactly my view. He has no right to use your body. But refusing such a tiny cost would be callous, even if it violates no right of his.'],
      ['singer', 'Then the principle is not really about your body, but about the size of the cost. If an hour is required, why not more, so long as a life is at stake?'],
      'Where between one hour and nine months does a duty become a kindness?',
    ),
    bb: r(
      'For you, your body is yours, for nine months and for an hour alike. Staying would be kind, but he has no right to it.',
      ['thomson', 'You have held the line between rights and kindness more firmly than I did. I said refusing the hour would be indecent, even if it wronged no one. Are you sure?'],
      ['singer', 'Rights aside, a man will die for want of an hour of your time. I cannot see how that is anything but wrong.'],
      'Can it be wrong to refuse something someone has no right to?',
    ),
  },

  'drowning-child': {
    aa: r(
      'You would wade in, and you think distance changes nothing: a child far away is just as much your concern.',
      ['singer', 'This is the conclusion I argued for. If you would ruin your shoes for the child in the pond, you should give for the child you will never see. Distance is not a moral fact.'],
      ['aristotle', 'Admirable. But a good life is lived among particular people: friends, family, city. A duty to everyone everywhere may leave no room for the ties that make us human.'],
      'If distance does not matter, how much of what you have should you give away?',
    ),
    ab: r(
      'You would wade in, but you feel less obliged to give to a child far away.',
      ['singer', 'Then what is the difference? The child is just as real, and the cost to you is the same. I think the difference is only that you can see one and not the other.'],
      ['kant', 'Helping others is a duty, but a wide one. You must make the good of others one of your ends, yet you may choose how and when. Rescuing the child in front of you is not optional.'],
      'Why does it feel different when you can see the person you could help?',
    ),
    ba: r(
      'You said you would not wade in, yet you feel just as obliged to the faraway child. An unusual pair of answers.',
      ['singer', 'If you feel obliged to the distant child, surely you are obliged to the one in front of you too. I would ask what held you back at the pond.'],
      ['aristotle', 'Perhaps you were thinking of the risk to yourself, or of what you could actually do. Practical wisdom looks at the particular case. Tell me what you saw that others did not.'],
      'What would stop you from helping someone in front of you?',
    ),
    bb: r(
      'You would not wade in, and you do not feel obliged to give. For you, helping strangers is not something you owe.',
      ['singer', 'Then I must press you. A child will drown, and the cost to you is a pair of shoes. I cannot see a principle that makes that acceptable.'],
      ['kant', 'Doing good for others is a duty, even if we may choose how. A rational person could not wish to live in a world where no one ever helped anyone in need.'],
      'Would you want to live in a world where no one helped a stranger?',
    ),
  },

  euthyphro: {
    aa: r(
      'For you, goodness comes from what God commands, and in a world without gods, cruelty would still be wrong in itself.',
      ['socrates', 'But if cruelty is wrong even without gods, then its wrongness is not just because it was commanded. Your two answers pull apart. Which do you hold more firmly?'],
      ['aquinas', 'There is a way to hold both. God’s commands follow God’s own goodness, and that goodness is written into our nature, so reason can know it even without hearing the command.'],
      'If something is wrong in itself, does it need anyone to command it?',
    ),
    ab: r(
      'For you, goodness comes from God’s command, and without any god, nothing would be forbidden.',
      ['socrates', 'Consistent. But then if the gods commanded cruelty, it would become good. Are you ready to say that?'],
      ['kant', 'I think morality cannot rest on any command, divine or human. The moral law comes from reason itself, binding every rational being whether or not a god exists.'],
      'If God commanded something cruel, would that make it good?',
    ),
    ba: r(
      'For you, God commands things because they are good, and cruelty would be wrong even without any god.',
      ['socrates', 'This was the answer I pressed Euthyphro towards. Then goodness is something the gods recognise, not something they invent. We can seek it ourselves.'],
      ['kant', 'Exactly. Morality is not a decree but a law reason gives itself. Cruelty is wrong because it treats a person as a thing, in any world, with or without gods.'],
      'Where do you think goodness comes from, if not from a command?',
    ),
    bb: r(
      'You think God commands what is good, but that without a lawgiver nothing would be forbidden.',
      ['socrates', 'Then I am puzzled. If the gods command things because they are good, why would those things stop being good when the gods are gone?'],
      ['aquinas', 'Perhaps you sense that law needs a lawgiver. But natural law can be known by reason, written into what we are. Without the divine source, the law is harder to explain, but it is still there.'],
      'Can a rule exist without anyone who made it?',
    ),
  },

  wager: {
    aa: r(
      'For you, the wager works: with infinite stakes, betting on God is rational, even with many religions to choose from.',
      ['hume', 'You trust a calculation where no evidence can reach. With thousands of rival gods, each promising heaven and threatening the others, I see no way to know which bet is best.'],
      ['kierkegaard', 'Calculation is the wrong road to faith. Faith is not a clever bet but a leap, a passionate commitment you live with your whole self.'],
      'Can you choose to believe something, or does belief just happen to you?',
    ),
    ab: r(
      'You thought the bet was rational, but once there were thousands of religions, it stopped pointing anywhere.',
      ['hume', 'Exactly where the argument fails. A bet with infinite stakes on every side gives you no reason to choose one rather than another.'],
      ['nietzsche', 'And notice what the wager asked of you: to believe out of fear of loss. A faith built on fear and calculation would be the poorest kind of faith.'],
      'Is fear a good reason to believe something?',
    ),
    ba: r(
      'You think this is the wrong way to decide about God, yet you think the wager could still work with many religions.',
      ['kierkegaard', 'Your first answer is the deeper one. Faith that comes from calculating odds is not faith at all. It is a business deal.'],
      ['hume', 'If one choice could be shown clearly best, perhaps. But nothing in experience tells us which god, if any, there is.'],
      'What would be a good reason to believe in God, or not to?',
    ),
    bb: r(
      'For you, betting on God is the wrong way to decide, and with so many religions, the wager points nowhere anyway.',
      ['hume', 'A wise person proportions their belief to the evidence. Where the evidence is silent, a calculation of rewards cannot fill the gap.'],
      ['nietzsche', 'You refuse to believe out of fear. Good. But then you must face a world without that guarantee, and find your own reasons to live well.'],
      'If not by calculation, how should anyone decide what to believe about the biggest questions?',
    ),
  },

  prisoners: {
    aa: r(
      'You would trust your partner and stay silent, and with years of repeated choices, you would cooperate and see.',
      ['smith', 'You understand how trust is built: not by selfishness alone, but by people who keep faith with each other over time. Markets and friendships both depend on it.'],
      ['hobbes', 'Admirable. But in a single game with a stranger and no one to enforce promises, trust is a gamble. That is why we create powers to make cooperation safe.'],
      'What makes you trust someone you cannot check up on?',
    ),
    ab: r(
      'You would stay silent once, but if it went on for years, you would protect yourself.',
      ['hobbes', 'Perhaps you sense that over time, one betrayal will come. Without a power to keep us honest, caution is reasonable.'],
      ['smith', 'Yet repeated dealing is exactly what makes trust pay. Over time, a reputation for honesty is worth more than any single betrayal.'],
      'Does knowing someone longer make you trust them more or less?',
    ),
    ba: r(
      'You would betray once, but with years of repeated choices, you would try cooperating.',
      ['smith', 'You see that a relationship changes the sums. When we will meet again, kindness and fair dealing become wise, not just good.'],
      ['hobbes', 'Exactly. Cooperation needs a reason to expect it. Repetition supplies one, as a government does: it makes the future matter.'],
      'Why might people be kinder to those they expect to see again?',
    ),
    bb: r(
      'You would betray, once and for years. Whatever the partner does, protecting yourself comes first.',
      ['hobbes', 'In a world without trust or a power over us, this is the rational choice, and it is why life without government is nasty, brutish and short.'],
      ['smith', 'Yet both of you end up worse off, year after year. Each looking only to themselves makes everyone poorer. Some trust is the foundation of every good thing people build together.'],
      'If everyone protected themselves first, what kind of world would we have?',
    ),
  },

  omelas: {
    aa: r(
      'You would stay in Omelas, and you would free the child even though it ends the city’s joy.',
      ['kant', 'Your second answer overrules your first. You saw that no one’s happiness can be built on using a child as a means. Follow that thought.'],
      ['bentham', 'You accepted the bargain, then broke it. Thousands lose their joy so one child is spared. I cannot see how the sums support you, though I understand the feeling.'],
      'Can you accept a benefit once you know what it costs someone else?',
    ),
    ab: r(
      'You would stay in Omelas, and you would leave the child in the cellar. The happiness of thousands comes first.',
      ['bentham', 'A hard but consistent answer. One person’s suffering, set against the happiness of thousands, is a small cost in the total.'],
      ['kant', 'Then the child is a means and nothing more. No sum of happiness can buy the right to treat a person that way.'],
      'Would your answer change if you were the child?',
    ),
    ba: r(
      'You would walk away from Omelas, and you would free the child, even at the cost of the city’s joy.',
      ['kant', 'You refused to profit from the child, and then refused to leave them. That is respect for a person, taken all the way.'],
      ['bentham', 'You have chosen one child’s relief over the happiness of a whole city. The sums are not on your side, though your courage is real.'],
      'Is it enough to refuse to take part in something wrong, or must you try to end it?',
    ),
    bb: r(
      'You would walk away from Omelas, but you would not free the child yourself.',
      ['kant', 'Walking away keeps your hands clean. But if you can end the child’s suffering, is leaving enough? Ask whether you are refusing a wrong or only refusing to see it.'],
      ['bentham', 'At least you do not destroy the city’s joy. But walking away helps no one at all. It spares only your conscience.'],
      'Does walking away from a wrong do anything for the person suffering it?',
    ),
  },

  demon: {
    aa: r(
      'You believe there is something even a demon cannot fake, and you want to know what is real even if it makes no difference.',
      ['descartes', 'Yes. Even if I am deceived, I must exist to be deceived. I think, therefore I am. And from that one certainty, I set out to rebuild knowledge.'],
      ['hume', 'You value the truth for its own sake. A noble wish. But in daily life, habit and custom carry us, and no argument could ever give us the certainty you want.'],
      'What is the one thing you are most sure of, and why?',
    ),
    ab: r(
      'You believe there is something the demon cannot fake, yet if nothing could ever tell the worlds apart, you think it would not matter which is true.',
      ['descartes', 'Then hold on to the certainty you found: you exist, thinking. That much the demon cannot take. The rest must be rebuilt carefully.'],
      ['wittgenstein', 'Your second answer is wise. A doubt that could never be settled, even in principle, may not be a real doubt at all. It is language idling.'],
      'If a question could never be answered by anything, is it still a real question?',
    ),
    ba: r(
      'You think nothing would be certain, yet you would still want to know which world is real.',
      ['hume', 'An honest scepticism. We cannot prove the world is real, and yet we cannot help believing it. Nature is too strong for our doubts.'],
      ['descartes', 'Not nothing. Even in doubting, you are thinking, and so you exist. Start there, and your wish to know what is real has firm ground.'],
      'Why might we want the truth even when it changes nothing?',
    ),
    bb: r(
      'You think nothing would be certain, and that if no difference could ever be found, it does not matter which world is real.',
      ['wittgenstein', 'You see that doubt needs grounds. If nothing could ever settle the question, doubting the world is not even a coherent move in our language.'],
      ['hume', 'A cheerful scepticism. We cannot prove our beliefs, but we go on living, dining and playing backgammon. That is how human nature answers the sceptic.'],
      'How do you go on with life when you cannot be certain of anything?',
    ),
  },

  'murderer-at-the-door': {
    aa: r(
      'You would lie to save your friend, and you feel partly responsible when the lie led the killer to them.',
      ['kant', 'You see what I argued: once you lie, you have taken responsibility for what follows from it. Had you told the truth, whatever happened would not have been your doing.'],
      ['mill', 'You did the right thing with what you knew. The consequences went wrong through chance, not through your choice. The blame belongs to the killer.'],
      'Are we responsible for the results of our choices that we could not have foreseen?',
    ),
    ab: r(
      'You would lie to save your friend, and the killer, not you, is to blame for what happened.',
      ['mill', 'I agree. You acted to save a life, which is what the situation demanded. A rule against lying that lets your friend die has forgotten what rules are for.'],
      ['kant', 'Yet you chose to deceive, and your lie set events in motion. Truthfulness is a duty to everyone. Once you break it, you cannot wash your hands of what follows.'],
      'Can a lie ever be the most honest thing to do?',
    ),
    ba: r(
      'You would not lie, even now, yet you feel partly responsible when a lie leads to your friend’s death.',
      ['kant', 'Consistent. A lie makes you answerable for its results. The truth keeps your hands clean, whatever the murderer then does.'],
      ['mill', 'But if you refuse to lie and your friend dies, are you not responsible for that too? Doing nothing is also a choice with consequences.'],
      'Is refusing to act a way of avoiding responsibility, or of taking it?',
    ),
    bb: r(
      'You would not lie, even to a killer, and you think the killer alone is to blame for what happens.',
      ['kant', 'This is my position. The duty not to lie holds even here. You are responsible for your truthfulness, not for the wicked choices of another.'],
      ['mill', 'A principle that sends a murderer to your friend is a principle that has lost its purpose. Rules about honesty exist to protect people, not to be kept at their expense.'],
      'Is there any rule you would keep even if it cost a life?',
    ),
  },

  'deathbed-promise': {
    aa: r(
      'You would keep your word, and knowing the son found out only strengthens your view that promises must be trusted.',
      ['kant', 'A promise made to the dying binds as fully as any other. If promises could be broken whenever the sums looked better, no promise would mean anything.'],
      ['bentham', 'You value trust in promises, and trust does produce a great deal of happiness. But a dead man cannot be harmed, and the money could save lives.'],
      'Do we owe anything to people who have died?',
    ),
    ab: r(
      'You would keep your word, and you think the son learning of it changes nothing: the right thing was done.',
      ['kant', 'Exactly. The promise was right to keep whether or not anyone ever learned of it. Duty does not wait for an audience.'],
      ['bentham', 'You have kept a promise to someone who can no longer enjoy its keeping. The good it could have done elsewhere was real. I would have given it to charity.'],
      'Would you keep a promise if no one would ever know you broke it?',
    ),
    ba: r(
      'You would give to charity, but the son learning of it makes you think promises must be trusted after all.',
      ['bentham', 'Your first answer was right. The son’s disappointment is real, but small next to lives saved. Still, you are wise to count the trust promises create.'],
      ['kant', 'Your second answer shows what was wrong with the first. Promises are only worth anything if they are kept even when breaking them looks better.'],
      'What would happen to promises if everyone broke them for good causes?',
    ),
    bb: r(
      'You would give to charity, and you think the right thing was done whatever the son learns.',
      ['bentham', 'Clear and consistent. A dead man cannot be made happier, but living children can be saved. The promise mattered less than the lives.'],
      ['kant', 'You have used a dying man’s trust as a means to your own idea of the good. However worthy the cause, you made his word worthless.'],
      'Is breaking a promise ever the most trustworthy thing to do?',
    ),
  },

  commons: {
    aa: r(
      'You would add the sheep, yet once you held back and saw others add theirs, you would keep holding back.',
      ['aristotle', 'Your second answer shows a virtue your first lacked. A good person does their part for the common good, even when others do not.'],
      ['hobbes', 'Noble, but you will grow poorer while the field is ruined anyway. Without a rule enforced on everyone, restraint by a few changes nothing.'],
      'Is it worth doing the right thing if it does not change the outcome?',
    ),
    ab: r(
      'You would add the sheep, and when you saw others adding theirs, you would stop holding back.',
      ['hobbes', 'This is exactly the trap. Each one acting reasonably for themselves destroys what all of them need. That is why shared things need a power to protect them.'],
      ['aristotle', 'What is held in common is often cared for least. But a city is more than a crowd of private interests. We become good by acting for the whole.'],
      'What shared thing in your life gets ruined because no one feels responsible for it?',
    ),
    ba: r(
      'You would hold back, and keep holding back even as others take more. For you, someone has to do the right thing.',
      ['aristotle', 'This is the character of a good citizen: acting for the common good, not just your own. Virtue is shown most clearly when it costs you something.'],
      ['hobbes', 'Admirable, and futile. Your sheep grow thin while the field is ruined by others. Restraint without enforcement only punishes the restrained.'],
      'Should you keep doing the right thing when others are not?',
    ),
    bb: r(
      'You would hold back at first, but once others kept adding sheep, you would stop restraining yourself.',
      ['hobbes', 'Reasonable. No one should be made a fool by their own restraint. The answer is not more virtue, but rules that bind everyone.'],
      ['aristotle', 'Understandable, but notice how the field is lost. Each person waits for the others to be good first. Character means acting well even then.'],
      'Who should go first when everyone is waiting for someone else to change?',
    ),
  },

  sisyphus: {
    aa: r(
      'You think Sisyphus’s life can have meaning in how he lives it, and you would let him take the drug that makes him love the boulder.',
      ['camus', 'Careful. I said we must imagine Sisyphus happy, but his happiness comes from his clear-eyed revolt. A drug that removes the struggle removes the very thing that made it his.'],
      ['nietzsche', 'If the drug makes him say yes to his fate, perhaps. But a yes that is chemical is not a yes he has earned. Love of fate must be won, not given.'],
      'Is a happiness you did not choose still yours?',
    ),
    ab: r(
      'You think Sisyphus’s life can have meaning in how he lives it, and that a drug to love the work would be a trick.',
      ['camus', 'Exactly. The struggle itself towards the heights is enough to fill a heart. His dignity lies in facing the absurd with open eyes, not in being made to forget it.'],
      ['nietzsche', 'You see that meaning must be made, not swallowed. Say yes to your fate with your whole will. That is the only yes that counts.'],
      'Is there something hard in your life that you have found a way to make your own?',
    ),
    ba: r(
      'You think Sisyphus’s life is pointless, but you would give him the drug so at least it feels good to him.',
      ['camus', 'You see the absurd, and you want to soften it. But the drug is a kind of suicide of the mind. I would rather Sisyphus face his rock awake.'],
      ['nietzsche', 'Pity for Sisyphus. Is that kindness, or contempt? To decide his life is worthless and then sedate him is to give up on him.'],
      'Would you rather feel good or see clearly?',
    ),
    bb: r(
      'You think Sisyphus’s life is pointless, and that a drug to love it would only be a trick.',
      ['camus', 'You see the absurd clearly. Now the real question: having seen it, how will you live? I said one must imagine Sisyphus happy, not fooled, but in revolt.'],
      ['nietzsche', 'You refuse false comfort. Good. But do not stop at saying “pointless”. The death of old meanings is the chance to create new ones.'],
      'If life has no meaning built in, where could meaning come from?',
    ),
  },

  recurrence: {
    aa: r(
      'You would take the eternal return as a gift, yet you would still change one painful thing.',
      ['nietzsche', 'Then your yes is not yet complete. To love fate is to want nothing to be different, not forward, not backward, not in all eternity. That is the summit, and it is hard to reach.'],
      ['epicurus', 'There is no shame in wishing away a pain. But the past cannot be changed, so let it go, and turn to the pleasures and friendships within your reach today.'],
      'Is there something painful in your past you would now not change?',
    ),
    ab: r(
      'You would take the eternal return as a gift, and you would not change your past, since it made you who you are.',
      ['nietzsche', 'This is amor fati, love of fate. To say yes to your whole life, pain included, is the greatest affirmation a person can make.'],
      ['kierkegaard', 'Life can only be understood backwards, but it must be lived forwards. You accept your past. Now the question is what you will choose next.'],
      'What in your life are you most glad happened, even though it hurt?',
    ),
    ba: r(
      'The eternal return would feel like a curse, and you would change one painful thing in your past.',
      ['nietzsche', 'Honest. Most of us would gnash our teeth at the demon. But ask what would have to change in how you live now for the answer to become yes.'],
      ['epicurus', 'Pain that is past is past. Spend no more of your present on it. A calm mind and good friends now are worth more than any rewritten history.'],
      'What would make you want to live your life again, exactly as it is?',
    ),
    bb: r(
      'The eternal return would feel like a curse, yet you would not change your past, since it made you who you are.',
      ['kierkegaard', 'You hold your past even while dreading its return. That is the anxiety of a self that knows it must choose itself, again and again.'],
      ['nietzsche', 'You accept your past but cannot yet love it. That is the step between. The question is whether you can live so that you would want it all again.'],
      'What would you have to change about how you live now to welcome living it again?',
    ),
  },

  'utility-monster': {
    aa: r(
      'If happiness is what counts, everyone should feed the monster, and your answer changes when the monster is a rich country.',
      ['bentham', 'Then you see the logic of happiness, and also its limits in practice. Real happiness rarely works like the monster. Still, greater total happiness is what we should seek.'],
      ['rawls', 'Your second answer shows the problem: counting total happiness can justify the poor starving so the rich enjoy luxury. Justice must protect each person, not only the sum.'],
      'Should the happiness of the many ever outweigh the needs of the few?',
    ),
    ab: r(
      'If happiness is what counts, everyone should feed the monster, and that stays true even when the monster is a whole rich country.',
      ['bentham', 'Consistent. If the wealthy country truly gains more, the sums say so. My principle asks us to follow them, even when they surprise us.'],
      ['nozick', 'Then a theory of maximising happiness lets the poor starve for the luxury of the rich. That is why I invented the monster: to show that people are not just containers for happiness.'],
      'Is there anything wrong with a rule that would let some people starve so others can be happier?',
    ),
    ba: r(
      'Something felt wrong with feeding the monster, yet when it is a rich country, your answer changes.',
      ['rawls', 'Your first instinct was right. Each person is separate and has a claim not to be sacrificed for others’ gain. Keep hold of it.'],
      ['nozick', 'Notice what you sensed: people are not interchangeable vessels for happiness. That should hold for countries as well as monsters.'],
      'Why might something seem wrong for a creature but acceptable for a country?',
    ),
    bb: r(
      'Something has gone wrong with feeding the monster, and it is the same problem when the monster is a rich country.',
      ['nozick', 'Exactly my point. If total happiness were all that mattered, we would have to feed the monster. Since we should not, something more than happiness matters: rights, persons.'],
      ['rawls', 'Utilitarianism does not take seriously the difference between persons. Justice asks first how the worst-off fare, not how great the total is.'],
      'What should a fair society protect, even if doing so lowers total happiness?',
    ),
  },

  'chinese-room': {
    aa: r(
      'For you, the whole system understands Chinese, and a machine like today’s AI could truly understand in principle.',
      ['wittgenstein', 'You judge understanding by use. If the room uses the language correctly in every situation, what more could understanding be? Meaning is use.'],
      ['descartes', 'I said machines might speak words, but never arrange them to answer the meaning of all that is said, as the dullest person can. I am not sure your system escapes that test.'],
      'How would you tell whether someone, or something, really understands you?',
    ),
    ab: r(
      'For you, the whole system understands, but a modern AI could not truly understand.',
      ['wittgenstein', 'Then what is the difference between them? If both use language well in all our ways of living, the line you draw needs explaining.'],
      ['descartes', 'Perhaps you sense that understanding needs a mind, not only a mechanism. That is what I believed: the thinking thing is not a machine.'],
      'What would a machine need, beyond answering well, to understand?',
    ),
    ba: r(
      'You think the room only shuffles symbols, yet that a machine like today’s AI could truly understand in principle.',
      ['wittgenstein', 'A learning machine is not following rules from a book, and perhaps that matters to you. Understanding is shown in how language is woven into life.'],
      ['descartes', 'Whether rules are written or learned, it is still a mechanism. I would ask what in it does the thinking.'],
      'Does how something learned matter to whether it understands?',
    ),
    bb: r(
      'For you, the room only shuffles symbols, and understanding needs more than any machine like this.',
      ['descartes', 'I agree. A machine may produce words, but it does not think them. Understanding belongs to a thinking mind, and that is not made of parts.'],
      ['wittgenstein', 'Then tell me what that “more” is. If you cannot point to it, you may be picturing understanding as a hidden inner thing, a picture that holds us captive.'],
      'What do you think understanding actually is?',
    ),
  },

  'lottery-of-birth': {
    aa: r(
      'You think the first student earned their success, and that people are still responsible for their choices, whatever shaped them.',
      ['nozick', 'I agree. Whatever luck gave you, what you then do with it is yours. Holdings fairly acquired and freely exchanged belong to those who hold them.'],
      ['rawls', 'No one deserves their talents or their starting place. A fair society does not erase effort, but it does not pretend success is purely earned either.'],
      'How much of what you have achieved would you have managed starting somewhere very different?',
    ),
    ab: r(
      'You think the first student earned their success, yet you suspect luck goes all the way down.',
      ['rawls', 'Your second answer is the deeper one. Even effort is shaped by things no one chooses. That is why the gains of the lucky should help the unlucky.'],
      ['nozick', 'Your first answer was the sounder. If luck goes all the way down, no one deserves anything, praise or blame. Is that a world you could live in?'],
      'If no one fully deserves their success, should anyone be proud of it?',
    ),
    ba: r(
      'You think the first student’s success was partly luck, but that we are still responsible for our choices.',
      ['sen', 'A balanced view. What matters is what people are actually able to do and be. Luck shapes those capabilities, and choices still count.'],
      ['rawls', 'You see both sides. Luck should not decide a life, so a fair society corrects for it, while still leaving room for effort to matter.'],
      'What should a society do about luck it cannot control?',
    ),
    bb: r(
      'You think the first student’s success was largely luck, and that luck goes all the way down, even into effort.',
      ['rawls', 'Then you see why I thought natural talents should be treated as a common asset. No one deserves their place in the lottery.'],
      ['nozick', 'If no one deserves anything, then no one deserves the help you would give them either. Desert may be the wrong idea. The question is what people are entitled to.'],
      'If no one deserves their luck, who should decide how its rewards are shared?',
    ),
  },
}
