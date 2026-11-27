/**
 * The great thought experiments, written to be played: a scene, a choice, a
 * twist that tests the choice, a second choice, then what famous thinkers
 * made of it. The takes are kept to what each thinker actually argued.
 */

export interface Choice {
  id: 'a' | 'b'
  label: string
}

export interface Take {
  name: string
  /** links to the Hall when the thinker is one of the 47 */
  id?: string
  take: string
}

export interface Experiment {
  id: string
  title: string
  /** who devised it, and where */
  origin: string
  domain: 'Ethics' | 'Mind' | 'Identity' | 'Knowledge' | 'Justice' | 'Meaning' | 'Religion'
  /** one line for the card */
  teaser: string
  setup: string
  question: string
  choices: [Choice, Choice]
  twist: string
  twistQuestion: string
  twistChoices: [Choice, Choice]
  takes: Take[]
  /** what the experiment is really probing, shown at the end */
  point: string
}

const yn = (yes: string, no: string): [Choice, Choice] => [
  { id: 'a', label: yes },
  { id: 'b', label: no },
]

export const EXPERIMENTS: Experiment[] = [
  {
    id: 'trolley',
    title: 'The Trolley',
    origin: 'Philippa Foot, 1967; Judith Jarvis Thomson, 1976',
    domain: 'Ethics',
    teaser: 'Five lives, one lever, and your hand on it.',
    setup: 'A runaway trolley is heading down the track toward five people who cannot get away. You are standing by a lever. Pull it, and the trolley switches to a side track, where it will kill one person instead.',
    question: 'Do you pull the lever?',
    choices: yn('Pull it: one death is better than five', 'Leave it: I will not choose who dies'),
    twist: 'Now there is no lever. You are on a footbridge above the track, beside a very large stranger. If you push him off, his body will stop the trolley. He will die; the five will live. The numbers are exactly the same.',
    twistQuestion: 'Do you push him?',
    twistChoices: yn('Push: the numbers have not changed', 'No: this is different'),
    takes: [
      { name: 'Jeremy Bentham', id: 'bentham', take: 'Five lives outweigh one. Lever or footbridge, the right act is the one that produces the most happiness, so you should do both.' },
      { name: 'Immanuel Kant', id: 'kant', take: 'Pushing the man uses him merely as a means, as a tool to stop a trolley. That is forbidden whatever the numbers.' },
      { name: 'Judith Jarvis Thomson', id: 'thomson', take: 'Most people pull the lever but will not push. Explaining why, without simply counting lives, is the real puzzle.' },
      { name: 'Philippa Foot', take: 'Our duty not to harm someone is stronger than our duty to help someone. Redirecting a harm differs from starting one.' },
    ],
    point: 'Whether morality is only about outcomes, or also about what you do to whom, and how.',
  },
  {
    id: 'theseus',
    title: 'The Ship of Theseus',
    origin: 'Plutarch, 1st century; Thomas Hobbes, 1655',
    domain: 'Identity',
    teaser: 'Replace every plank. Is it the same ship?',
    setup: 'The Athenians kept the ship of their hero Theseus in the harbour. As each plank rotted, they replaced it with a new one. After many years not a single original plank remains.',
    question: 'Is it still the ship of Theseus?',
    choices: yn('Yes: it changed gradually, but it is the same ship', 'No: it is a new ship that looks the same'),
    twist: 'A shipwright has been quietly keeping every old plank. He now rebuilds them, exactly as they were, into a second ship. Two ships sit in the harbour.',
    twistQuestion: 'Which one is the ship of Theseus?',
    twistChoices: [
      { id: 'a', label: 'The one in service: continuity matters' },
      { id: 'b', label: 'The rebuilt one: the original material matters' },
    ],
    takes: [
      { name: 'Thomas Hobbes', id: 'hobbes', take: 'Added the rebuilt ship to the puzzle, and answered that it depends on which sense of "same" we mean: same matter, same form, or same continuing thing.' },
      { name: 'David Hume', id: 'hume', take: 'We call it the same because the changes were gradual and it served the same purpose. The sameness is a habit of our imagination, not a fact in the ship.' },
      { name: 'Derek Parfit', id: 'parfit', take: 'Asking which is "really" the same may be an empty question. What matters is how much is continued, not a yes or no.' },
    ],
    point: 'What makes anything, including you, the same thing over time.',
  },
  {
    id: 'experience-machine',
    title: 'The Experience Machine',
    origin: 'Robert Nozick, Anarchy, State, and Utopia, 1974',
    domain: 'Meaning',
    teaser: 'A perfect life, wired straight into your brain.',
    setup: 'Neuroscientists can plug you into a machine that gives you any experiences you like: writing a great novel, falling in love, being admired. While inside, you will not know it is a machine. It will feel completely real, for the rest of your life.',
    question: 'Do you plug in?',
    choices: yn('Yes: a good life is how it feels', 'No: I want my life to be real'),
    twist: 'A doctor sits down beside you and says quietly that you have been in the machine for years. Your real life outside is lonely and ordinary.',
    twistQuestion: 'Do you unplug?',
    twistChoices: yn('Unplug: I want the truth', 'Stay: what I have here is better'),
    takes: [
      { name: 'Robert Nozick', id: 'nozick', take: 'Most of us would not plug in. We want to actually do things and be a certain kind of person, not just have the experience of it, so pleasure cannot be all that matters.' },
      { name: 'Jeremy Bentham', id: 'bentham', take: 'If pleasure is the only good, refusing the machine is a mistake born of prejudice.' },
      { name: 'John Stuart Mill', id: 'mill', take: 'Some pleasures are higher than others, and they require real engagement with the world. Better a real person dissatisfied than a satisfied illusion.' },
    ],
    point: 'Whether a good life is a matter of how it feels from the inside, or of what is actually true.',
  },
  {
    id: 'veil',
    title: 'The Veil of Ignorance',
    origin: 'John Rawls, A Theory of Justice, 1971',
    domain: 'Justice',
    teaser: 'Design a society without knowing who you will be in it.',
    setup: 'You get to choose the rules of a society, but behind a veil: you do not know whether you will be born rich or poor, talented or not, healthy or sick. Society A is richer on average, but the worst-off live in real hardship. Society B is less rich overall, but no one falls below a decent life.',
    question: 'Which society do you choose?',
    choices: [
      { id: 'a', label: 'A: the bigger, richer society' },
      { id: 'b', label: 'B: the floor no one falls below' },
    ],
    twist: 'The veil lifts slightly. You learn you are likely to be born talented, with an excellent chance of ending up near the top in either society.',
    twistQuestion: 'Do you still choose the same?',
    twistChoices: yn('Yes: my answer should not depend on where I land', 'No: now I would choose differently'),
    takes: [
      { name: 'John Rawls', id: 'rawls', take: 'Behind the veil, rational people would protect the worst-off position, since it might be theirs. Inequalities are just only when they benefit the least advantaged.' },
      { name: 'Robert Nozick', id: 'nozick', take: 'Justice is not a pattern to design from above. If people acquired what they have fairly and exchanged it freely, the result is just, whatever it looks like.' },
      { name: 'Jeremy Bentham', id: 'bentham', take: 'Choose whatever produces the greatest total happiness; the average matters more than the floor.' },
    ],
    point: 'Whether fairness means what impartial people would agree to, and how much our answers depend on knowing our own luck.',
  },
  {
    id: 'gyges',
    title: 'The Ring of Gyges',
    origin: 'Plato, Republic, Book II',
    domain: 'Ethics',
    teaser: 'A ring that makes you invisible. Would you still be good?',
    setup: 'A shepherd finds a gold ring that makes him invisible when he turns it. He can take anything, go anywhere, and never be caught or blamed. Suppose the ring is now yours.',
    question: 'Would you still live exactly as you do now?',
    choices: yn('Yes: I am honest because it is right', 'Honestly, no: I would bend some rules'),
    twist: 'Someone you love is struggling badly. With the ring you could take money from a very rich company that would never notice the loss.',
    twistQuestion: 'Do you take it?',
    twistChoices: yn('Yes: no one is really harmed', 'No: stealing is still stealing'),
    takes: [
      { name: 'Glaucon, in Plato', id: 'plato', take: 'Glaucon argues that anyone with the ring would act unjustly, so people are only just for fear of being caught.' },
      { name: 'Plato', id: 'plato', take: 'Through Socrates, he replies that injustice corrupts the soul itself. The unjust person is never truly happy, ring or no ring.' },
      { name: 'Thomas Hobbes', id: 'hobbes', take: 'Without a power over us all, there is no justice at all. Justice is an agreement kept in place by fear of punishment.' },
    ],
    point: 'Whether you are good for its own sake, or because people are watching.',
  },
  {
    id: 'cave',
    title: 'The Cave',
    origin: 'Plato, Republic, Book VII',
    domain: 'Knowledge',
    teaser: 'Everything you know might be shadows on a wall.',
    setup: 'Prisoners have been chained in a cave all their lives, facing a wall. Behind them a fire casts shadows of objects onto it. The shadows are all they have ever seen, so they take them for reality. You are freed, and stumble painfully up into the dazzling sunlight, where you see real things for the first time.',
    question: 'Do you stay in the light?',
    choices: yn('Stay: the truth is worth the pain', 'Go back: down there was comfortable and familiar'),
    twist: 'You think of the others still chained below. If you go back to tell them, your eyes will be useless in the dark, they will laugh at you, and they may turn violent.',
    twistQuestion: 'Do you go back down to free them?',
    twistChoices: yn('Go back: they deserve the truth', 'Stay: they would not want it'),
    takes: [
      { name: 'Plato', id: 'plato', take: 'The one who sees the truth has a duty to return and help the others, even at great risk. That is why philosophers must take part in ruling.' },
      { name: 'Socrates', id: 'socrates', take: 'Plato\'s readers saw Socrates here: the man who questioned Athens and was put to death for it.' },
      { name: 'Friedrich Nietzsche', id: 'nietzsche', take: 'Distrusted the idea of a single true world beyond appearances. For him, the "real world" story was itself a fable.' },
    ],
    point: 'Whether truth is worth discomfort, and what you owe those who have not seen it.',
  },
  {
    id: 'marys-room',
    title: 'Mary\'s Room',
    origin: 'Frank Jackson, 1982',
    domain: 'Mind',
    teaser: 'She knows everything about red, but has never seen it.',
    setup: 'Mary is a brilliant scientist who has lived her whole life in a black-and-white room. She has learned every physical fact about colour: wavelengths, how the eye and brain respond, everything. One day she walks out and sees a red rose for the first time.',
    question: 'Does she learn something new?',
    choices: yn('Yes: now she knows what red is like', 'No: she already knew everything about it'),
    twist: 'Suppose instead that Mary\'s complete scientific knowledge let her predict exactly how her brain would react, and she is not surprised at all.',
    twistQuestion: 'Does she still learn something new?',
    twistChoices: yn('Yes: knowing about it is not the same as having it', 'No: then there was nothing more to learn'),
    takes: [
      { name: 'Frank Jackson', take: 'Originally argued that Mary learns a new fact, so the physical facts are not all the facts, and the mind is more than the physical. He later changed his mind.' },
      { name: 'Daniel Dennett', take: 'If Mary truly knew everything physical, she would not be surprised. Our intuition only feels strong because we cannot imagine knowing that much.' },
      { name: 'Ludwig Wittgenstein', id: 'wittgenstein', take: 'Warned that our words for inner experiences can mislead us into thinking of a private object we "see" inside.' },
    ],
    point: 'Whether the mind can be fully explained by physical science.',
  },
  {
    id: 'teleporter',
    title: 'The Teleporter',
    origin: 'Derek Parfit, Reasons and Persons, 1984',
    domain: 'Identity',
    teaser: 'You are scanned, destroyed, and rebuilt on Mars.',
    setup: 'A teleporter records the exact state of every cell in your body, destroys the original, and builds a perfect copy on Mars within minutes. The copy has your memories, your personality, and feels exactly like you.',
    question: 'Would you step in to travel?',
    choices: yn('Yes: the one who arrives is me', 'No: it would kill me and make a twin'),
    twist: 'Something goes wrong. The copy is built on Mars, but you are not destroyed on Earth. You are told your heart was damaged and you will die in a few days. Your copy will carry on your life.',
    twistQuestion: 'Should you be as upset as at ordinary death?',
    twistChoices: yn('Yes: I am still dying', 'Not really: what matters about me continues'),
    takes: [
      { name: 'Derek Parfit', id: 'parfit', take: 'Personal identity is not what matters. Psychological continuity is, and the copy has it, so being teleported is about as good as ordinary survival.' },
      { name: 'John Locke', id: 'locke', take: 'A person is the same as far as their consciousness and memory extend back, which seems to make the copy you.' },
      { name: 'The Buddha', id: 'buddha', take: 'There was never a fixed self to lose. Clinging to one is the root of suffering.' },
    ],
    point: 'What "you" actually are, and whether it is that which matters in survival.',
  },
  {
    id: 'violinist',
    title: 'The Violinist',
    origin: 'Judith Jarvis Thomson, A Defense of Abortion, 1971',
    domain: 'Ethics',
    teaser: 'You wake up, plugged into a stranger to keep him alive.',
    setup: 'You wake up in hospital, your kidneys connected to a famous violinist who has a fatal illness. Without you he dies; with you, he will recover in nine months. You never agreed to this. Unplugging is allowed by the hospital.',
    question: 'Must you stay connected for nine months?',
    choices: yn('Yes: his life outweighs my inconvenience', 'No: my body is mine to decide about'),
    twist: 'Now it is not nine months. He needs you for just one hour.',
    twistQuestion: 'Must you stay for the hour?',
    twistChoices: yn('Yes: refusing would be wrong', 'It would be kind, but he has no right to it'),
    takes: [
      { name: 'Judith Jarvis Thomson', id: 'thomson', take: 'A right to life is not a right to use someone else\'s body. Staying the nine months would be generous, not required. For one hour, refusing would be indecent, but still not a violation of his rights.' },
      { name: 'Peter Singer', id: 'singer', take: 'If you can prevent a great harm at moderate cost, you ought to, whatever rights are involved.' },
      { name: 'Elizabeth Anscombe', id: 'anscombe', take: 'Held that some acts are wrong whatever their consequences, and was a firm critic of reasoning that weighs lives against each other.' },
    ],
    point: 'The difference between what we owe others as a right and what decency asks of us.',
  },
  {
    id: 'drowning-child',
    title: 'The Drowning Child',
    origin: 'Peter Singer, Famine, Affluence, and Morality, 1972',
    domain: 'Ethics',
    teaser: 'Ruin your new shoes to save a child?',
    setup: 'On your way to school you pass a shallow pond. A small child is drowning in it. Wading in will ruin your brand-new shoes and make you late, but you can easily save the child.',
    question: 'Do you wade in?',
    choices: yn('Of course', 'No'),
    twist: 'Far away, a child is dying of a disease that a small donation, about the price of those shoes, would prevent. You will never see the child.',
    twistQuestion: 'Are you just as obliged to give?',
    twistChoices: yn('Yes: distance does not change it', 'No: it is not the same'),
    takes: [
      { name: 'Peter Singer', id: 'singer', take: 'If we can prevent something bad without sacrificing anything of comparable importance, we ought to. Distance makes no moral difference, so most of us should give far more than we do.' },
      { name: 'Immanuel Kant', id: 'kant', take: 'We have a duty of beneficence, but it is an "imperfect" duty: we must help others, but we have some freedom in how much and whom.' },
      { name: 'Aristotle', id: 'aristotle', take: 'Generosity is a virtue of character, giving the right amount to the right people in the right way, not a fixed sum.' },
    ],
    point: 'Whether our duties to strangers far away are as strong as to those in front of us.',
  },
  {
    id: 'euthyphro',
    title: 'The Euthyphro Question',
    origin: 'Plato, Euthyphro',
    domain: 'Religion',
    teaser: 'Is something good because God commands it?',
    setup: 'Socrates meets Euthyphro, who is sure he knows what piety is. Socrates asks him: is something holy because the gods love it, or do the gods love it because it is holy?',
    question: 'Which is it, for goodness?',
    choices: [
      { id: 'a', label: 'Good because God (or the gods) command it' },
      { id: 'b', label: 'God commands it because it is good' },
    ],
    twist: 'Imagine a world with no gods at all.',
    twistQuestion: 'Would cruelty for fun still be wrong there?',
    twistChoices: yn('Yes: it is wrong in itself', 'No: without a lawgiver, nothing is forbidden'),
    takes: [
      { name: 'Socrates', id: 'socrates', take: 'If good is whatever the gods command, it becomes arbitrary; if they command it because it is good, goodness does not depend on them.' },
      { name: 'Thomas Aquinas', id: 'aquinas', take: 'God commands what is good because goodness flows from God\'s own nature. God neither invents morality nor obeys a standard outside himself.' },
      { name: 'Immanuel Kant', id: 'kant', take: 'Morality rests on reason, which binds every rational being. We recognise God\'s commands as good by the moral law within us.' },
    ],
    point: 'Whether right and wrong can exist without anyone to command them.',
  },
  {
    id: 'wager',
    title: 'Pascal\'s Wager',
    origin: 'Blaise Pascal, Pensées, 1670',
    domain: 'Religion',
    teaser: 'Infinite gain against finite loss. Do you bet?',
    setup: 'Reason cannot settle whether God exists, Pascal says, yet you must bet one way or the other. If you believe and God exists, you gain infinite happiness. If you believe and God does not exist, you lose little. If you do not believe and God exists, you lose everything.',
    question: 'Is it rational to bet on God?',
    choices: yn('Yes: the stakes are lopsided', 'No: this is the wrong way to decide'),
    twist: 'Thousands of religions each promise reward for believing in their god, and punishment for believing in another.',
    twistQuestion: 'Does the wager still work?',
    twistChoices: yn('Yes, if one choice is clearly best', 'No: it now points nowhere'),
    takes: [
      { name: 'Blaise Pascal', take: 'You must wager. Since the gain is infinite and the cost finite, wager that God exists, and act as if you believe until belief comes.' },
      { name: 'David Hume', id: 'hume', take: 'A wise person proportions their belief to the evidence. Belief chosen for its payoff is not belief grounded in reason.' },
      { name: 'Friedrich Nietzsche', id: 'nietzsche', take: 'Saw such reasoning as a calculation born of fear, not the honest, life-affirming way to face the world.' },
    ],
    point: 'Whether you can, or should, believe something because it pays to.',
  },
  {
    id: 'prisoners',
    title: 'The Prisoners\' Dilemma',
    origin: 'Merrill Flood and Melvin Dresher, 1950; named by Albert Tucker',
    domain: 'Justice',
    teaser: 'Trust your partner, or betray them first?',
    setup: 'You and a partner are arrested and held apart. If you both stay silent, you each get one year. If you betray them and they stay silent, you go free and they get ten years. If you both betray each other, you both get five.',
    question: 'Do you stay silent or betray?',
    choices: [
      { id: 'a', label: 'Stay silent: trust them' },
      { id: 'b', label: 'Betray: it is safer whatever they do' },
    ],
    twist: 'Now you will face this exact choice with the same partner every week, for years to come.',
    twistQuestion: 'Does that change what you do?',
    twistChoices: yn('Yes: I would cooperate and see if they do', 'No: I would still protect myself'),
    takes: [
      { name: 'Thomas Hobbes', id: 'hobbes', take: 'Without a power to enforce agreements, people cannot trust each other, so they betray, and everyone ends up worse off. That is why we need a sovereign.' },
      { name: 'Adam Smith', id: 'smith', take: 'Self-interest can serve the common good, but markets also depend on trust, reputation and the sympathy we feel for others.' },
      { name: 'Robert Axelrod', take: 'In repeated games, the simple strategy of cooperating first and then copying your partner\'s last move does remarkably well.' },
    ],
    point: 'How cooperation can arise between people who each act for themselves.',
  },
  {
    id: 'omelas',
    title: 'The City of Omelas',
    origin: 'Ursula K. Le Guin, The Ones Who Walk Away from Omelas, 1973',
    domain: 'Justice',
    teaser: 'A perfect city, built on one child\'s suffering.',
    setup: 'Omelas is a city of joy, beauty and kindness. But its happiness depends on one child, kept alone in a dark cellar in misery. Every citizen learns of the child. If the child were freed, all of Omelas\'s happiness would vanish.',
    question: 'Would you live in Omelas?',
    choices: yn('Stay: the happiness of thousands outweighs one', 'Walk away: I could not live on that'),
    twist: 'You find the cellar unlocked. You could free the child yourself tonight, ending the suffering and the city\'s joy together.',
    twistQuestion: 'Do you free the child?',
    twistChoices: yn('Yes', 'No'),
    takes: [
      { name: 'Jeremy Bentham', id: 'bentham', take: 'If the total happiness is vast and the suffering is one child\'s, the arithmetic favours the city.' },
      { name: 'Immanuel Kant', id: 'kant', take: 'No one may be used merely as a means to others\' happiness. The child\'s treatment is wrong whatever it buys.' },
      { name: 'Ursula K. Le Guin', take: 'Leaves the story open: some citizens simply walk away from Omelas, toward a place she cannot describe.' },
    ],
    point: 'Whether the happiness of many can justify the suffering of one.',
  },
  {
    id: 'demon',
    title: 'The Evil Demon',
    origin: 'René Descartes, Meditations, 1641',
    domain: 'Knowledge',
    teaser: 'What if everything you see is a deception?',
    setup: 'Suppose a powerful demon is deceiving you about everything: the world, your body, even simple sums. Everything you experience is an illusion he creates.',
    question: 'Is there anything you could still be certain of?',
    choices: yn('Yes: there is something he cannot fake', 'No: nothing would be certain'),
    twist: 'You have no way, even in principle, of telling the demon\'s world from a real one. Your life would feel exactly the same either way.',
    twistQuestion: 'Does it still matter which is true?',
    twistChoices: yn('Yes: I want to know what is real', 'No: if it makes no difference, it does not matter'),
    takes: [
      { name: 'René Descartes', id: 'descartes', take: 'Even if I am deceived, I must exist to be deceived. I think, therefore I am: the one certainty from which to rebuild.' },
      { name: 'David Hume', id: 'hume', take: 'We cannot prove the outside world by reason, but nature makes us believe it anyway. Doubt that deep does not survive leaving the study.' },
      { name: 'Ludwig Wittgenstein', id: 'wittgenstein', take: 'Doubt only makes sense against a background of things we do not doubt. A doubt about everything is not really a doubt.' },
    ],
    point: 'What, if anything, we can know for certain.',
  },
  {
    id: 'murderer-at-the-door',
    title: 'The Murderer at the Door',
    origin: 'Immanuel Kant, On a Supposed Right to Lie, 1797; Benjamin Constant',
    domain: 'Ethics',
    teaser: 'Would you lie to save a friend?',
    setup: 'Your friend is hiding in your house. A man with a knife knocks and asks whether they are inside. You are sure he means to kill them.',
    question: 'Do you lie to him?',
    choices: yn('Yes: a life matters more than the truth', 'No: I will not lie, even now'),
    twist: 'You lie and say your friend left by the back. Unknown to you, your friend has just slipped out the back, and the killer finds them there.',
    twistQuestion: 'Are you partly responsible for their death?',
    twistChoices: yn('Yes: my lie led him there', 'No: the killer is to blame'),
    takes: [
      { name: 'Immanuel Kant', id: 'kant', take: 'Truthfulness is a duty to everyone. If you lie, you are responsible for what follows from it; if you tell the truth, you are not.' },
      { name: 'Benjamin Constant', take: 'We owe the truth only to those who have a right to it, and a murderer has no such right.' },
      { name: 'John Stuart Mill', id: 'mill', take: 'Rules like "do not lie" are generally useful, but they admit exceptions where obeying them would cause far greater harm.' },
    ],
    point: 'Whether some moral rules hold without exception.',
  },
  {
    id: 'deathbed-promise',
    title: 'The Deathbed Promise',
    origin: 'A classic case in debates about utilitarianism',
    domain: 'Ethics',
    teaser: 'A promise no one alive will ever know you broke.',
    setup: 'Your dying friend asks you to give his savings to his wealthy son, who does not need it. You promise. After he dies, you realise the money could save dozens of lives if given to charity, and no one else knows of the promise.',
    question: 'Do you keep the promise?',
    choices: yn('Keep it: I gave my word', 'Give to charity: lives matter more'),
    twist: 'Years later the son learns of the promise and of what you did.',
    twistQuestion: 'Does it change your answer?',
    twistChoices: yn('Yes: it matters that people can trust promises', 'No: the right thing was done either way'),
    takes: [
      { name: 'Jeremy Bentham', id: 'bentham', take: 'A promise to the dead produces no happiness for them. Give to whoever the money will help most.' },
      { name: 'Immanuel Kant', id: 'kant', take: 'Breaking a promise when convenient cannot be made a universal law; it destroys the very practice of promising.' },
      { name: 'W. D. Ross', take: 'We have several genuine duties, keeping promises and doing good among them. When they clash, we must judge which is weightier here.' },
    ],
    point: 'Whether a promise binds you even when breaking it would do more good.',
  },
  {
    id: 'commons',
    title: 'The Common Field',
    origin: 'Garrett Hardin, The Tragedy of the Commons, 1968; after William Forster Lloyd',
    domain: 'Justice',
    teaser: 'One more sheep each, and the field dies.',
    setup: 'Villagers share a common field. Each family profits from grazing one more sheep, while the cost of overgrazing is spread among everyone. You are deciding whether to add a sheep.',
    question: 'Do you add the sheep?',
    choices: yn('Yes: the gain is mine, the cost is shared', 'No: I will hold back'),
    twist: 'You hold back, and watch your neighbours add sheep anyway. The field is wearing thin.',
    twistQuestion: 'Do you keep holding back?',
    twistChoices: yn('Yes: someone has to', 'No: restraint alone just makes me poorer'),
    takes: [
      { name: 'Aristotle', id: 'aristotle', take: 'What is common to the greatest number gets the least care. Each thinks mainly of his own.' },
      { name: 'Thomas Hobbes', id: 'hobbes', take: 'Without an enforcing power, private restraint is foolish. A common authority must set the rules.' },
      { name: 'Elinor Ostrom', take: 'Real communities often manage commons well without private ownership or a state, through rules they make and enforce themselves.' },
    ],
    point: 'How shared goods survive when each person gains by taking a little more.',
  },
  {
    id: 'sisyphus',
    title: 'The Happy Sisyphus',
    origin: 'Albert Camus, 1942; Richard Taylor, 1970',
    domain: 'Meaning',
    teaser: 'Push the boulder forever. Can that life mean anything?',
    setup: 'The gods condemned Sisyphus to roll a boulder up a hill forever. Each time he reaches the top, it rolls down again.',
    question: 'Could his life have meaning?',
    choices: yn('Yes, in how he lives it', 'No: it is pointless'),
    twist: 'The gods, feeling merciful, offer Sisyphus a drug that makes him love pushing the boulder more than anything.',
    twistQuestion: 'Should he take it?',
    twistChoices: yn('Yes: then his life is good to him', 'No: that would be a trick, not meaning'),
    takes: [
      { name: 'Albert Camus', id: 'camus', take: 'Sisyphus is the absurd hero: lucid about his fate and scornful of the gods. The struggle itself is enough to fill a heart. One must imagine Sisyphus happy.' },
      { name: 'Richard Taylor', take: 'If Sisyphus wanted nothing but to push stones, his life would have meaning from the inside, as ours does.' },
      { name: 'Friedrich Nietzsche', id: 'nietzsche', take: 'The highest affirmation is to love your fate, not merely to bear it.' },
    ],
    point: 'Whether meaning is found in what a life achieves, or in how it is lived.',
  },
  {
    id: 'recurrence',
    title: 'The Eternal Return',
    origin: 'Friedrich Nietzsche, The Gay Science, 1882',
    domain: 'Meaning',
    teaser: 'Would you live this exact life again, forever?',
    setup: 'A demon creeps into your loneliest moment and says: this life, as you have lived it, you will live again, and again, infinitely, every pain and joy in the same order.',
    question: 'How do you take the news?',
    choices: [
      { id: 'a', label: 'As a gift: I would say yes to it' },
      { id: 'b', label: 'As a curse: I could not bear it' },
    ],
    twist: 'The demon offers a bargain: you may change one painful thing in your past, but everything that grew from it, good as well as bad, changes too.',
    twistQuestion: 'Do you change it?',
    twistChoices: yn('Yes: some pain is not worth keeping', 'No: it made me who I am'),
    takes: [
      { name: 'Friedrich Nietzsche', id: 'nietzsche', take: 'The demon is a test. To greet him as a god, to want nothing to be different, is the greatest affirmation of life.' },
      { name: 'Epicurus', id: 'epicurus', take: 'What matters is a tranquil life free from fear. A good life lived once is complete; it needs no repeating.' },
      { name: 'Søren Kierkegaard', id: 'kierkegaard', take: 'Life is lived forwards and understood backwards. The real question is whether you have chosen your life, not just endured it.' },
    ],
    point: 'Whether you affirm your life as it is, or only as you wish it had been.',
  },
  {
    id: 'utility-monster',
    title: 'The Utility Monster',
    origin: 'Robert Nozick, Anarchy, State, and Utopia, 1974',
    domain: 'Justice',
    teaser: 'One being who enjoys everything a thousand times more.',
    setup: 'A creature gains a thousand times more happiness from every bit of food or kindness than anyone else does. If what matters is total happiness, giving everything to it would make the world happiest.',
    question: 'Should everyone give it what it needs?',
    choices: yn('Yes, if happiness is what counts', 'No: something has gone wrong here'),
    twist: 'Now the monster is not a creature but a whole wealthy country, which genuinely gains more pleasure from luxury than poorer nations do from food.',
    twistQuestion: 'Does your answer change?',
    twistChoices: yn('Yes', 'No: the problem is the same'),
    takes: [
      { name: 'Robert Nozick', id: 'nozick', take: 'If a theory demands that we all be sacrificed to the monster, the theory is wrong. Individuals are not mere containers of happiness.' },
      { name: 'Jeremy Bentham', id: 'bentham', take: 'Each is to count for one and no one for more than one, though pleasures are to be added up.' },
      { name: 'John Rawls', id: 'rawls', take: 'Utilitarianism does not take seriously the distinction between persons. Justice protects each one, not just the total.' },
    ],
    point: 'Whether doing the most good can ever mean ignoring fairness to each person.',
  },
  {
    id: 'chinese-room',
    title: 'The Chinese Room',
    origin: 'John Searle, Minds, Brains, and Programs, 1980',
    domain: 'Mind',
    teaser: 'Perfect answers in Chinese, and no understanding at all.',
    setup: 'You sit in a room with a huge rulebook. Notes in Chinese, which you cannot read, come through a slot. By following the rules you send back perfect Chinese replies. To people outside, the room seems to understand Chinese fluently.',
    question: 'Does anyone in the room understand Chinese?',
    choices: yn('Yes: the whole system understands', 'No: it is only shuffling symbols'),
    twist: 'Today\'s AI systems hold fluent conversations in any language, built by learning patterns rather than by following written rules.',
    twistQuestion: 'Could a machine like that truly understand?',
    twistChoices: yn('Yes, in principle', 'No: understanding needs more than this'),
    takes: [
      { name: 'John Searle', take: 'Running a program is never enough for understanding. Symbols alone carry no meaning without a mind that grasps them.' },
      { name: 'Daniel Dennett', take: 'Our intuition misleads us; understanding may just be what complex enough symbol-processing is.' },
      { name: 'Ludwig Wittgenstein', id: 'wittgenstein', take: 'The meaning of a word lies in its use. Understanding shows itself in how a language is used in a form of life.' },
    ],
    point: 'Whether thinking is just processing, and what understanding really is.',
  },
  {
    id: 'lottery-of-birth',
    title: 'The Lottery of Birth',
    origin: 'After Rawls and Sen; a modern classic in debates about desert',
    domain: 'Justice',
    teaser: 'Do you deserve what your talents earn?',
    setup: 'Two students work equally hard. One was born with a quick mind into a home full of books; the other was not. The first wins a scholarship and later a high-paying career.',
    question: 'Does the first student deserve their success?',
    choices: yn('Yes: they earned it', 'Not fully: much of it was luck'),
    twist: 'Even the capacity to work hard, research suggests, is shaped heavily by genes and upbringing that no one chooses.',
    twistQuestion: 'Does anyone deserve anything, then?',
    twistChoices: yn('Yes: we are still responsible for our choices', 'Less than we think: luck goes all the way down'),
    takes: [
      { name: 'John Rawls', id: 'rawls', take: 'No one deserves their natural talents or starting place. A just society treats these as a common asset that should benefit everyone.' },
      { name: 'Robert Nozick', id: 'nozick', take: 'Even if we do not deserve our talents, we are entitled to them and to what we freely earn with them.' },
      { name: 'Amartya Sen', id: 'sen', take: 'What matters is what people are actually able to do and be. Fairness means attending to real capabilities, not just outcomes or entitlements.' },
    ],
    point: 'How much of what we have is earned, and what that means for fairness.',
  },
]

export const DOMAIN_COLOURS: Record<Experiment['domain'], string> = {
  Ethics: '#E07A62',
  Mind: '#ABA4EC',
  Identity: '#7FC4A6',
  Knowledge: '#8FB3E8',
  Justice: '#E3B25A',
  Meaning: '#D98CB3',
  Religion: '#C9B99A',
}

/** Today's dilemma: the same for everyone on a given day. */
export function experimentOfTheDay(date = new Date()): Experiment {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000)
  return EXPERIMENTS[day % EXPERIMENTS.length]
}
