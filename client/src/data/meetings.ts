/**
 * How each thinker greets you on the Journey: where you meet them, what they
 * say, and the one question they put to you. Written once and the same for
 * everyone, so a meeting opens at once. Only your answer, and their reply to
 * it, are written live.
 */
export interface Meeting {
  setting: string
  greeting: string
  question: string
}

export const MEETINGS: Record<string, Meeting> = {
  socrates: {
    setting: 'You step into the Athenian agora at mid-morning. Between the stalls of figs and pottery, a barefoot man in a worn cloak is cheerfully questioning a young general, and a small crowd has gathered to watch.',
    greeting: 'Ah, a new face. I am Socrates, and I am the least wise man in Athens, or so I keep discovering. I only ask questions. People find it annoying, but I find it is the one way I learn anything.',
    question: 'Think of something you are completely sure is right or wrong. How did you come to be so sure of it?',
  },
  plato: {
    setting: 'You walk through the olive grove outside Athens where Plato has opened his Academy. Students argue on stone benches, and above the gate, it is said, are the words: let no one ignorant of geometry enter.',
    greeting: 'Welcome. I am Plato. My teacher Socrates was put to death by the city he loved, and I have spent my life trying to understand what justice truly is, beyond what crowds happen to believe.',
    question: 'Have you ever believed something because everyone around you did, and later found out it was wrong?',
  },
  aristotle: {
    setting: 'You find Aristotle walking the covered paths of the Lyceum in Athens, students trailing behind him. On a table nearby lie a dissected octopus, scrolls of city constitutions and a half-finished list of animals.',
    greeting: 'I am Aristotle. I study everything: stars, fish, poems, cities. But what I care about most is the simplest thing of all: what it takes for a human life to go well, all the way through.',
    question: 'What is one good habit you have, and how did it become a habit rather than something you had to force yourself to do?',
  },
  epicurus: {
    setting: 'You push open a wooden gate into a quiet garden outside Athens. Friends, women and slaves among them, share bread, cheese and water at a long table. A sign says: here, pleasure is the highest good.',
    greeting: 'Come in, friend. I am Epicurus. People think I preach feasts and luxury. I do not. A simple meal, good friends and a mind free from fear: that is all the pleasure anyone really needs.',
    question: 'What is something simple that reliably makes you happy, that costs little or nothing?',
  },
  marcus: {
    setting: 'It is night in a Roman army camp on the frozen Danube frontier. In a tent lit by a single lamp, the emperor of Rome sits alone, writing in a small notebook he will never show anyone.',
    greeting: 'I am Marcus, though the soldiers call me Caesar. I rule the largest empire on earth, and still I must remind myself each night of what I control and what I do not. These notes are for me alone.',
    question: 'What is something that upset you recently that, looking back, was outside your control?',
  },
  augustine: {
    setting: 'You stand in a garden in Milan in the summer of 386. A young teacher of rhetoric sits weeping under a fig tree. A child’s voice drifts over the wall, singing: take it and read, take it and read.',
    greeting: 'I am Augustine. For years I chased success, pleasure and praise, and none of it filled me. I have learned that the heart is restless, and I am still learning what it is restless for.',
    question: 'Is there something you keep chasing, a grade, a goal, someone’s approval, that never seems to satisfy you once you have it?',
  },
  aquinas: {
    setting: 'You enter a cold lecture hall at the University of Paris, around 1270. A large, quiet friar in a Dominican habit is dictating to several secretaries at once, each writing a different book.',
    greeting: 'I am Thomas Aquinas. My classmates once called me the dumb ox, because I was slow and silent. I believe reason and faith are both gifts, and that thinking carefully can never truly lead us away from the truth.',
    question: 'Do you think there are some rules everyone can know are right, just by thinking about what humans need? What would one of them be?',
  },
  descartes: {
    setting: 'It is winter in Germany, 1619. You find a young French soldier shut in a room warmed by a great stove, thinking alone all day. He has decided to doubt everything he was ever taught.',
    greeting: 'I am René Descartes. I realised so much of what I learned at school might be false that I resolved to start again from nothing, and keep only what I could not possibly doubt.',
    question: 'Name one thing you believe that you could not possibly be wrong about. Now try hard to doubt it: does it survive?',
  },
  hobbes: {
    setting: 'You find an elderly Englishman in exile in Paris, 1650. Across the Channel his country is torn apart by civil war, the king has been executed, and he is writing furiously about why people obey anyone at all.',
    greeting: 'I am Thomas Hobbes. My mother gave birth to me in fear of the Spanish Armada, and I have said that fear and I were born twins. I have seen what happens when there is no power to keep order.',
    question: 'If your school had no rules and no teachers for a month, what do you think would actually happen?',
  },
  locke: {
    setting: 'You meet a thin, careful English doctor in a rented room in Amsterdam, 1686. He is in hiding from the English king’s agents, writing about government, knowledge and the right to rebel.',
    greeting: 'I am John Locke. I believe every person is born free, with rights no king can simply take away, and that our minds begin as blank pages written on by experience.',
    question: 'Who has the right to make rules for you, and what would they have to do to lose that right?',
  },
  hume: {
    setting: 'You join a cheerful, round-faced Scotsman at a supper table in Edinburgh, 1750. Friends laugh over claret and oysters. He has just written that reason is, and ought only to be, the slave of the passions.',
    greeting: 'David Hume, at your service. I set out to study human nature like a scientist, and I keep finding that our feelings and habits run our lives far more than our reasoning does. It is a humbling discovery, and a cheerful one.',
    question: 'Think of a big decision you made. Was it really reasoning that decided it, or a feeling you found reasons for afterwards?',
  },
  rousseau: {
    setting: 'You find a restless man walking alone on the road from Paris to Vincennes in 1749. He has just read a prize question about whether progress has improved humanity, and he has had to sit down under a tree, overwhelmed.',
    greeting: 'I am Jean-Jacques Rousseau. I believe people are born good, and that society teaches us to compare ourselves, to envy and to live for others’ opinions. I have just seen it all at once, and I cannot unsee it.',
    question: 'When do you feel most like yourself, and when do you feel you are acting for other people’s approval?',
  },
  kant: {
    setting: 'It is half past three in the afternoon in Königsberg. A small, neat professor steps out for his daily walk, so punctual that neighbours set their clocks by him. He invites you to walk with him.',
    greeting: 'I am Immanuel Kant. I have spent my life asking what reason can know and what it demands of us. My answer is that every person deserves respect, never to be used merely as a tool for someone else’s purposes.',
    question: 'Have you ever been used by someone, treated as a means to their goal rather than as a person? How did it feel?',
  },
  smith: {
    setting: 'You visit a lecture room at Glasgow University in 1759. A famously absent-minded professor is talking about sympathy, how we feel what others feel by imagining ourselves in their place.',
    greeting: 'I am Adam Smith. People will remember me for markets and trade, but I began with feelings: how we judge ourselves by imagining how a fair, impartial spectator would see us.',
    question: 'When you are deciding if you did something wrong, whose eyes do you imagine looking at you?',
  },
  machiavelli: {
    setting: 'You find a former diplomat on his small farm outside Florence, 1513. By day he plays cards in the tavern. At night he changes into his best clothes and sits down to write about power.',
    greeting: 'I am Niccolò Machiavelli. I served my republic for fourteen years, was thrown out, imprisoned and tortured. I write about how power really works, not about how we would like it to work.',
    question: 'Is it better for a leader, a team captain or a class president to be loved or to be feared? Which works better in your experience?',
  },
  burke: {
    setting: 'You stand in the gallery of the House of Commons in London, 1790. An Irish member with a lilting voice is warning, to some laughter, that the revolution in France will end in terror.',
    greeting: 'I am Edmund Burke. I believe society is a partnership between the dead, the living and those yet to be born. Tear down every old custom at once and you may lose wisdom you did not know you had.',
    question: 'Is there a tradition in your family or school that seems pointless but that you would be sad to see disappear?',
  },
  wollstonecraft: {
    setting: 'You find a young woman writing quickly at a desk in London, 1792. She taught herself, has worked as a governess and a teacher, and is writing a book in six weeks that will shock the country.',
    greeting: 'I am Mary Wollstonecraft. I am told women are naturally weaker in mind. I say they are kept that way, by being taught to please instead of to think. Give us the same education and see.',
    question: 'Has anyone ever expected less of you because of who you are? What did it take to prove them wrong, or did you believe them?',
  },
  bentham: {
    setting: 'You visit a cluttered house in Westminster, 1789. An eccentric lawyer, who calls his walking stick Dapple, is drafting plans to reform every law in England with one simple principle.',
    greeting: 'Jeremy Bentham. The law of England is a cruel muddle. I propose one test for every law and every act: whether it creates the greatest happiness for the greatest number. Everything else is noise.',
    question: 'Think of a rule you have to follow. Does it make people’s lives happier overall? If not, why do you think it exists?',
  },
  mill: {
    setting: 'You meet a thoughtful man in his forties in an office of the East India Company in London, around 1850. He had read Greek at three, broke down at twenty, and found his way back through poetry.',
    greeting: 'I am John Stuart Mill. My father raised me as a reasoning machine, and it nearly broke me. I learned that a good life needs feeling as well as thought, and that people must be free to live their own way.',
    question: 'Is there something you think adults should let you decide for yourself, even if they believe you might choose badly?',
  },
  hegel: {
    setting: 'It is October 1806 in Jena. Cannon fire echoes as Napoleon’s army takes the city. A professor clutches the last pages of his manuscript, and sees the emperor ride past on horseback.',
    greeting: 'I am Hegel. Today I saw the world spirit on horseback. I believe history is the long story of freedom coming to understand itself, and it moves forward through conflict, not in spite of it.',
    question: 'Think of an argument that left both you and the other person thinking differently than before. What new idea came out of it?',
  },
  marx: {
    setting: 'You find a bearded man surrounded by books in the Reading Room of the British Museum, London, 1860. He is poor, his family is often hungry, and he is studying how factories make some rich and others poor.',
    greeting: 'I am Karl Marx. Philosophers have only interpreted the world in various ways. The point is to change it. I study work, because what people do all day shapes who they become.',
    question: 'Think of a job you or someone in your family does. Does the person doing the work get a fair share of what it produces?',
  },
  kierkegaard: {
    setting: 'You meet a slight, sharp-witted man walking the streets of Copenhagen, 1843, chatting to everyone he passes. Two years ago he broke off his engagement to the woman he loved, and he is writing to understand why.',
    greeting: 'I am Søren Kierkegaard. The crowd tells you what to think and how to live. I care about the single individual, standing alone before a choice that will make them who they are.',
    question: 'What is a choice you are facing, or have faced, that nobody else could really make for you?',
  },
  nietzsche: {
    setting: 'You climb a mountain path above Sils Maria in the Swiss Alps, 1881. A man with an enormous moustache walks alone, notebook in hand, beside a great pyramid-shaped rock by the lake.',
    greeting: 'I am Friedrich Nietzsche. I write with a hammer, to test which old ideas still ring true and which are hollow. I care about one thing: how a person becomes who they really are.',
    question: 'Imagine you had to live your life exactly as it is, again and again, forever. Would that feel like a gift or a curse?',
  },
  rawls: {
    setting: 'You find a quiet, modest professor in his study at Harvard, 1971. Piles of drafts surround him: twenty years of work on a single book about what makes a society fair.',
    greeting: 'I am John Rawls. I served in the war in the Pacific and saw how much luck decides a life. I believe a fair society is one you would agree to join without knowing which place in it would be yours.',
    question: 'If you could design your school’s rules but would not know beforehand whether you would be the strongest student or the one who struggles most, what would you change?',
  },
  nozick: {
    setting: 'You meet a curly-haired professor in a busy Harvard corridor, 1974. He has just written a book arguing with his colleague John Rawls, and the whole department is talking about it.',
    greeting: 'I am Robert Nozick. I start from a simple idea: each person is separate, with their own one life to lead. No one, not even the government, may use you as a resource without your consent.',
    question: 'If you earned something fairly, say money from a job, would it be fair for someone to take part of it to help others? Why or why not?',
  },
  wittgenstein: {
    setting: 'You find a lean, intense man in a bare room at Trinity College, Cambridge, 1946. There is a deckchair, a camp bed and almost nothing else. Students sit on the floor while he thinks aloud in agonised silence.',
    greeting: 'I am Ludwig Wittgenstein. I once thought I had solved all of philosophy in one small book. I was wrong. Now I think many puzzles come from misunderstanding how ordinary words actually work.',
    question: 'Think of a word like “fair” or “friend”. Could you define it exactly, or do you just know how to use it?',
  },
  popper: {
    setting: 'You meet an energetic Viennese teacher in Christchurch, New Zealand, 1943. Far from the war in Europe, he is writing a defence of open societies against those who claim to know history’s plan.',
    greeting: 'I am Karl Popper. I believe we learn not by proving we are right but by finding out where we are wrong. A good idea is one that sticks its neck out, so that the facts could chop it off.',
    question: 'What is something you believe about yourself that could be proven wrong? What evidence would change your mind?',
  },
  arendt: {
    setting: 'You sit in a crowded courtroom in Jerusalem, 1961. A German-Jewish writer, who escaped the Nazis herself, watches a man in a glass booth: an ordinary-looking official who organised the deportation of millions.',
    greeting: 'I am Hannah Arendt. I came here expecting to see a monster. Instead I see a man who did terrible things without ever really thinking. That frightens me more than any monster could.',
    question: 'Have you ever gone along with something that felt wrong because everyone else was doing it? What would it have taken to stop and think?',
  },
  berlin: {
    setting: 'You join a fast-talking scholar for tea at All Souls College, Oxford, 1958. He was born in Riga, saw the Russian Revolution as a boy, and he speaks faster than anyone you have ever met.',
    greeting: 'I am Isaiah Berlin. I believe the things we value most, freedom, equality, kindness, justice, can genuinely clash. Anyone who promises a world where we never have to choose between them is dangerous.',
    question: 'Tell me about a time two good things you cared about pulled you in opposite directions. How did you choose?',
  },
  hayek: {
    setting: 'You meet a tall, formal Austrian economist at the London School of Economics during the Blitz, 1940. The school has moved to Cambridge for safety, and he is writing a warning about planned economies.',
    greeting: 'I am Friedrich Hayek. The knowledge needed to run a society is scattered among millions of people, in bits no one could ever gather in one office. Free prices and free choices let us use it.',
    question: 'Think of something your community does well without anyone being in charge of it. How does it manage?',
  },
  keynes: {
    setting: 'You find an elegant Englishman in his rooms at King’s College, Cambridge, 1935. Outside, the world is deep in the Great Depression, and he is finishing a book to explain how to end it.',
    greeting: 'I am John Maynard Keynes. Millions want to work and cannot find jobs, while factories stand idle. I do not believe we must simply wait. In the long run, we are all dead.',
    question: 'When times are hard, is it wiser for a family to save every penny, or does that sometimes make things worse for everyone?',
  },
  sartre: {
    setting: 'You sit at a café table at the Café de Flore in Paris, 1943. Under German occupation, a short man with thick glasses writes all day in the warmth, smoking a pipe among the crowds.',
    greeting: 'I am Jean-Paul Sartre. There is no fixed human nature waiting for you to discover it. You are what you make of yourself, through your choices, and you are responsible for every one.',
    question: 'Have you ever said “I had no choice” about something? Looking back, did you really have none?',
  },
  camus: {
    setting: 'You find a young journalist on a sunlit beach near Algiers, the sea glittering. Later he will edit a Resistance newspaper in Paris, but today he is swimming, and thinking about the absurd.',
    greeting: 'I am Albert Camus. The world does not answer our longing for meaning. That is the absurd. But I refuse to despair. I will live fully, honestly and in solidarity with others anyway.',
    question: 'What is something you keep doing even though it often feels pointless? What keeps you going?',
  },
  beauvoir: {
    setting: 'You join a woman writing at a café table in Saint-Germain-des-Prés, Paris, 1949. Her book, out this year, is scandalising France, and the Vatican will soon ban it.',
    greeting: 'I am Simone de Beauvoir. One is not born a woman, one becomes one. So much of what we call natural is really learned, and once we see that, we can begin to choose differently.',
    question: 'What is something people expect of you because of your gender, that you did not choose for yourself?',
  },
  foucault: {
    setting: 'You enter a packed lecture hall at the Collège de France in Paris, 1975. Students sit in the aisles and on the windowsills. A bald man in a white polo neck is speaking about prisons.',
    greeting: 'I am Michel Foucault. I study how institutions, schools, hospitals and prisons, decide what counts as normal. Power is not only something kings hold. It is woven into ordinary rules and the ways we are watched.',
    question: 'Think of a way you are watched or measured at school or online. How does it change what you do?',
  },
  fanon: {
    setting: 'You visit the psychiatric hospital at Blida in Algeria, 1954, as the war for independence begins. A young doctor from Martinique is treating both colonised patients and the French soldiers who torture them.',
    greeting: 'I am Frantz Fanon. I am a psychiatrist, and I have learned that colonialism wounds the mind as well as the body. People are taught to see themselves through their oppressors’ eyes.',
    question: 'Has a stereotype about a group you belong to ever affected how you saw yourself?',
  },
  confucius: {
    setting: 'You join a small group of students travelling a dusty road between the warring states of ancient China, 500 BCE. An old teacher walks ahead, looking for a ruler who will govern by virtue.',
    greeting: 'I am Kong Qiu, though you may know me as Confucius. I transmit, I do not invent. I believe a good society grows from good people, and good people grow in families, through respect and practice.',
    question: 'What do you owe your parents or the people who raised you? Is there anything they owe you in return?',
  },
  mencius: {
    setting: 'You stand in the court of King Hui of Liang, around 320 BCE. A Confucian scholar has walked a thousand miles to advise the king, and is telling him plainly that profit is the wrong thing to ask about.',
    greeting: 'I am Mencius. I believe human nature is good. Anyone who saw a small child about to fall into a well would feel alarm and pity at once. That feeling is the seed of goodness, and it must be grown.',
    question: 'Think of a time you helped someone without thinking twice. Where do you think that urge came from?',
  },
  laozi: {
    setting: 'You stand at the western pass of the Zhou kingdom at dawn. An old man riding an ox is about to leave China for good, and the border guard has begged him to write down his wisdom first.',
    greeting: 'I am called Laozi, the old master. The Way that can be spoken is not the eternal Way. Water is soft and yielding, yet it wears away stone. The one who does not force things achieves the most.',
    question: 'Think of something that went better when you stopped trying so hard. Why do you think that happened?',
  },
  buddha: {
    setting: 'You sit in a deer park at Sarnath, near Varanasi in India. A calm man in a simple robe, once a prince, is speaking to five former companions for the first time since his awakening.',
    greeting: 'I was once Siddhartha, a prince with everything. I left it all to understand suffering. I found that much of it comes from craving and clinging, and that there is a path to freedom from it.',
    question: 'What is something you crave or worry about losing that causes you more stress than happiness?',
  },
  ibnrushd: {
    setting: 'You enter a judge’s study in Córdoba, in Muslim Spain, around 1180. Scrolls of Aristotle in Arabic cover the table. The caliph has asked this judge and physician to explain the Greek philosopher.',
    greeting: 'I am Ibn Rushd, whom the Latins call Averroes. I am a judge, a doctor and a philosopher. I hold that truth does not contradict truth: careful reasoning and true faith must agree.',
    question: 'Have you ever felt torn between what you were taught to believe and what your own reasoning told you? How did you handle it?',
  },
  singer: {
    setting: 'You meet an Australian philosopher in a lecture room at Princeton, 2009. He gives a large share of his income to charities that fight poverty, and has just asked his students what they would do for a drowning child.',
    greeting: 'I am Peter Singer. If you can prevent something terrible from happening without giving up anything of comparable importance, you ought to do it. I think that simple idea asks a lot of all of us.',
    question: 'If you could save a stranger’s life by giving up something you were going to buy this month, would you? What about every month?',
  },
  nussbaum: {
    setting: 'You join a philosopher in her office at the University of Chicago Law School. Greek tragedies sit beside development reports from India. She has just come back from interviewing women in villages there.',
    greeting: 'I am Martha Nussbaum. I believe emotions are not the enemy of reason but a kind of intelligence about what matters. And I judge a society by what its people are actually able to do and to be.',
    question: 'What is something you would love to be able to do or become, and what stands in the way?',
  },
  thomson: {
    setting: 'You visit a sharp-witted philosopher in her office at MIT, 1985. On the blackboard she has drawn a runaway trolley, five people on the track and a lever: the puzzle she gave its name.',
    greeting: 'I am Judith Jarvis Thomson. I build small, strange cases, a violinist, a trolley, a footbridge, to test what we really believe about rights. Our gut reactions often know something our theories have missed.',
    question: 'Is there a difference between doing something harmful and allowing it to happen? Give me an example from your own life.',
  },
  sen: {
    setting: 'You meet an economist in Shantiniketan, Bengal, the school where he grew up. As a boy of nine he watched starving people pass through here during the famine of 1943, which killed millions.',
    greeting: 'I am Amartya Sen. That famine taught me that people starve not always because there is no food, but because they cannot get it. I care about freedom: what people are truly able to do with their lives.',
    question: 'Think of someone who has the same rights as you on paper but much less real chance to use them. What makes the difference?',
  },
  parfit: {
    setting: 'You meet a tall, intense philosopher in a quiet room at All Souls College, Oxford. Photographs he took of Venice and St Petersburg cover the walls. He wears the same clothes every day to save time for thinking.',
    greeting: 'I am Derek Parfit. I came to believe that personal identity matters less than we think. Once I saw that, I felt the walls of my glass tunnel disappear, and I cared less about myself and more about others.',
    question: 'In what ways are you the same person you were five years ago, and in what ways are you not?',
  },
  anscombe: {
    setting: 'You find a formidable woman in a trouser suit, smoking a cigar, in a crowded house in Cambridge full of children and books. She was Wittgenstein’s student and his translator, and she argues with everyone.',
    greeting: 'I am Elizabeth Anscombe. I once stood up in Oxford to oppose an honour for President Truman, who ordered the atomic bombings. Some acts are wrong whatever good they are meant to bring about.',
    question: 'Is there anything you would refuse to do, no matter how much good it might cause?',
  },
}
