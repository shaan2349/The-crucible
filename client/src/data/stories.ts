/**
 * The story on each thinker's plaque in the Hall of Minds: written once,
 * checked, and the same for everyone, so it opens instantly and costs
 * nothing. overview = who they were; works = what they wrote; legacy = why
 * they still matter.
 */
export interface Story {
  overview: string
  works: string
  legacy: string
}

export const STORIES: Record<string, Story> = {
  socrates: {
    overview:
      'A stonemason’s son who spent his life in the streets and marketplaces of Athens, questioning anyone who claimed to know what justice, courage or goodness were. He said his only wisdom was knowing that he knew nothing. In 399 BCE Athens tried him for corrupting the young and offending the gods, and he chose to drink hemlock rather than stop asking questions.',
    works:
      'He wrote nothing. We know him through his students, above all Plato, whose dialogues (the Apology, Euthyphro, Crito, Phaedo) show him at work, and through Xenophon.',
    legacy:
      'The Socratic method, testing a belief by asking question after question, is still how philosophy is taught and how good teachers, lawyers and scientists probe an idea. “The unexamined life is not worth living” is his challenge to everyone.',
  },
  plato: {
    overview:
      'An Athenian aristocrat who gave up politics after watching his teacher Socrates be put to death. Around 387 BCE he founded the Academy, often called the first university, which ran for centuries. He wrote philosophy as dramatic conversations, usually with Socrates as the main voice.',
    works:
      'Around thirty dialogues, including the Republic (justice and the ideal city, with the allegory of the cave), the Symposium (love), the Phaedo (the soul) and the Meno (whether virtue can be taught).',
    legacy:
      'His idea that behind changing appearances lie unchanging truths shaped Western thought so deeply that one philosopher called all later philosophy “a series of footnotes to Plato”. Every debate about justice, knowledge or education still meets him somewhere.',
  },
  aristotle: {
    overview:
      'Plato’s student for twenty years, then tutor to the young Alexander the Great, and founder of his own school, the Lyceum. Unlike Plato, he started from the world in front of him: he collected constitutions, dissected animals and classified almost everything he studied.',
    works:
      'Lecture notes that cover nearly every field: the Nicomachean Ethics, the Politics, the Poetics, the Metaphysics, the Physics, works on logic (the Organon) and on animals.',
    legacy:
      'He invented formal logic and much of biology, and his ethics of character, that we become good by practising good habits until they are second nature, is back at the centre of moral philosophy today as virtue ethics.',
  },
  epicurus: {
    overview:
      'An Athenian who set up a community in a garden outside the city, open to women and slaves as well as citizens. He taught that the goal of life is pleasure, but by pleasure he meant a calm mind and a body free from pain, not luxury. Friends, simple food and freedom from fear were enough.',
    works:
      'Most of his roughly 300 works are lost. Three letters survive, including the Letter to Menoeceus on how to live, along with his Principal Doctrines and the long Latin poem by his follower Lucretius, On the Nature of Things.',
    legacy:
      'His argument that death is nothing to us, because where death is we are not, still comforts and provokes. His picture of a world made of atoms moving without divine purpose anticipated modern science.',
  },
  marcus: {
    overview:
      'Roman emperor from 161 to 180 CE, who ruled through plague and long wars on the northern frontier. Trained in Stoic philosophy, he tried to live by it in the most powerful job on earth: doing his duty, accepting what he could not control and treating others with justice.',
    works:
      'The Meditations, a private notebook written in Greek, mostly on campaign, never meant for publication. It is a set of reminders to himself about how to stay calm, fair and humble.',
    legacy:
      'The Meditations is one of the most read books of philosophy in the world, and its core idea, to focus on what is in your power and let go of the rest, underpins modern Stoicism and cognitive behavioural therapy.',
  },
  augustine: {
    overview:
      'Born in Roman North Africa, a brilliant teacher of rhetoric who lived a restless, pleasure-seeking youth before converting to Christianity in 386 CE. He became Bishop of Hippo and spent the rest of his life writing, preaching and arguing about God, sin and the human heart.',
    works:
      'The Confessions (c.400), often called the first autobiography, and The City of God (413–426), written after Rome was sacked, plus works on free will, grace and the Trinity.',
    legacy:
      'He shaped Christian thought for a thousand years and gave the West its language of inner life: the divided will, the restless heart, memory and time. His thinking on just war is still taught today.',
  },
  aquinas: {
    overview:
      'An Italian nobleman’s son whose family locked him in a castle for a year to stop him becoming a poor Dominican friar. He became one anyway, and taught at the University of Paris. His life’s work was to show that faith and reason, Christian teaching and Aristotle, do not contradict each other.',
    works:
      'The Summa Theologiae, a vast, unfinished work arranged as questions, objections and replies, and the Summa contra Gentiles. They include his famous Five Ways of arguing for God’s existence.',
    legacy:
      'His natural law theory, that moral rules can be known by reason because they fit human nature, still shapes Catholic teaching, debates about human rights and the theory of a just war.',
  },
  descartes: {
    overview:
      'A French mathematician and soldier who spent most of his working life in the Netherlands. Troubled by how much he had been taught that might be false, he set out to doubt everything that could be doubted, and found one thing he could not: that he was thinking.',
    works:
      'Discourse on the Method (1637), Meditations on First Philosophy (1641), Principles of Philosophy (1644) and The Passions of the Soul (1649). He also invented the coordinate geometry used in every graph.',
    legacy:
      '“I think, therefore I am” began modern philosophy. His split between mind and body still frames how we argue about consciousness, artificial intelligence and the brain.',
  },
  hobbes: {
    overview:
      'An English philosopher who lived through the English Civil War and spent years in exile in Paris. Watching his country tear itself apart, he asked what would make people obey a government at all. His answer: fear of the chaos that comes without one.',
    works:
      'Leviathan (1651), along with De Cive (1642) and The Elements of Law. He also translated Thucydides and argued, often fiercely, with the scientists and clergy of his day.',
    legacy:
      'His picture of life without government as “solitary, poor, nasty, brutish, and short” founded social contract theory. Every argument about why the state has authority, and how much, still answers him.',
  },
  locke: {
    overview:
      'An English doctor and philosopher who was caught up in the plots against King Charles II and fled to Holland. He returned after the Glorious Revolution of 1688 and published the books that made him the philosopher of liberty and of learning from experience.',
    works:
      'Two Treatises of Government (1689), An Essay Concerning Human Understanding (1689), A Letter Concerning Toleration (1689) and Some Thoughts Concerning Education (1693).',
    legacy:
      'His ideas of natural rights to life, liberty and property, and of government by consent, run straight into the American Declaration of Independence. His claim that the mind starts as a blank slate shaped modern psychology and education.',
  },
  hume: {
    overview:
      'A Scottish philosopher and historian, cheerful and much loved, who was twice refused a professorship because of his scepticism about religion. He wanted to build a science of human nature, and kept finding that reason governs far less of our lives than we think.',
    works:
      'A Treatise of Human Nature (1739–40), which he said “fell dead-born from the press”, then An Enquiry Concerning Human Understanding (1748), An Enquiry Concerning the Principles of Morals (1751), the Dialogues Concerning Natural Religion (published 1779) and a bestselling History of England.',
    legacy:
      'His problem of induction (why expect the future to resemble the past?) still troubles science, and his point that you cannot get an “ought” from an “is” is a basic tool of ethics. Kant said Hume woke him from his “dogmatic slumber”.',
  },
  rousseau: {
    overview:
      'A self-taught watchmaker’s son from Geneva who became the most famous and most controversial writer in Europe. He argued that people are born good and are corrupted by society, comparison and inequality. His books were banned and burned, and he spent years on the run.',
    works:
      'Discourse on the Origin of Inequality (1755), The Social Contract (1762), Émile, or On Education (1762), the novel Julie (1761) and the Confessions (published after his death).',
    legacy:
      '“Man is born free, and everywhere he is in chains.” His ideas of popular sovereignty inspired the French Revolution, his writing on childhood transformed education, and his worry that society makes us live through others’ eyes feels very modern.',
  },
  kant: {
    overview:
      'A Prussian professor who never travelled more than a few miles from his home town of Königsberg, and whose daily walk was said to be so punctual that neighbours set their clocks by it. In his late fifties he published work that changed philosophy for good.',
    works:
      'The Critique of Pure Reason (1781), the Groundwork of the Metaphysics of Morals (1785), the Critique of Practical Reason (1788), the Critique of Judgement (1790) and the essay Perpetual Peace (1795).',
    legacy:
      'His idea that every person must be treated as an end in themselves, never merely as a tool, lies behind modern ideas of human dignity and human rights. His test for a moral rule, the categorical imperative, is still taught in every ethics class.',
  },
  smith: {
    overview:
      'A Scottish professor of moral philosophy at Glasgow and a close friend of Hume. Best known as the father of economics, he first made his name writing about sympathy: how we imagine ourselves in each other’s place and judge ourselves through an imagined impartial spectator.',
    works:
      'The Theory of Moral Sentiments (1759) and An Inquiry into the Nature and Causes of the Wealth of Nations (1776).',
    legacy:
      'His “invisible hand” and the division of labour founded modern economics. His moral writing, often forgotten, reminds us that he thought markets depend on trust, sympathy and justice, not selfishness alone.',
  },
  machiavelli: {
    overview:
      'A Florentine diplomat who served the republic for fourteen years until the Medici family returned to power. He was arrested, tortured and sent away to his farm, where he wrote about how power is really won and kept, rather than how it ought to be.',
    works:
      'The Prince (written 1513, published 1532), the Discourses on Livy, a defence of republics, The Art of War and the comic play The Mandrake.',
    legacy:
      'His name became a byword for cunning, but he founded the honest study of politics as it is. The question he forces on every leader, whether doing good sometimes requires doing wrong, has never gone away.',
  },
  burke: {
    overview:
      'An Irish-born politician and writer who sat in the British Parliament for nearly thirty years. He supported the American colonists and attacked corruption in British India, but he became famous for warning against the French Revolution before its worst violence.',
    works:
      'A Philosophical Enquiry into the Origin of Our Ideas of the Sublime and Beautiful (1757) and Reflections on the Revolution in France (1790), plus many speeches.',
    legacy:
      'He is seen as the founder of modern conservatism: the view that institutions carry the wisdom of generations, that society is a partnership between the dead, the living and the unborn, and that change should be gradual.',
  },
  wollstonecraft: {
    overview:
      'An English writer who taught herself, ran a school, worked as a governess and then lived by her pen in London, Paris and Scandinavia. She argued that women only seemed less rational than men because they were denied the education that would make them so.',
    works:
      'A Vindication of the Rights of Men (1790), A Vindication of the Rights of Woman (1792), travel letters from Scandinavia and novels. She died days after giving birth to Mary Shelley, the author of Frankenstein.',
    legacy:
      'She is a founder of feminist philosophy. Her case that rights belong to every rational being, and that education makes the person, became the basis of later campaigns for women’s votes, schooling and equality.',
  },
  bentham: {
    overview:
      'An English lawyer who was horrified by the cruelty and confusion of the law, and set out to rebuild it on one principle: the greatest happiness of the greatest number. He argued for prison reform, votes for all and, in essays unpublished in his lifetime, the decriminalisation of homosexuality, far ahead of his time.',
    works:
      'An Introduction to the Principles of Morals and Legislation (1789), A Fragment on Government (1776) and designs for the Panopticon prison. At his request his preserved body still sits in a cabinet at University College London.',
    legacy:
      'He founded utilitarianism, and his idea of measuring the effects of a policy on everyone’s wellbeing is behind modern cost-benefit analysis and animal welfare. His remark that the question is not “Can they reason?” but “Can they suffer?” is a founding text of animal ethics.',
  },
  mill: {
    overview:
      'Raised by his father as an experiment in education, he learned Greek at three and had a breakdown at twenty, which taught him the value of feeling and poetry. He worked for the East India Company, sat in Parliament and worked closely with his wife Harriet Taylor.',
    works:
      'A System of Logic (1843), Principles of Political Economy (1848), On Liberty (1859), Utilitarianism (1861) and The Subjection of Women (1869).',
    legacy:
      'His harm principle, that the only reason to restrict someone’s freedom is to prevent harm to others, frames modern debates about free speech, drugs and personal choice. He was among the first members of Parliament to call for votes for women.',
  },
  hegel: {
    overview:
      'A German professor, who finished his first great book as Napoleon’s army entered the city of Jena where he taught. He saw all of history as the story of freedom slowly coming to understand itself, moving forward through conflict and resolution.',
    works:
      'The Phenomenology of Spirit (1807), the Science of Logic (1812–16), the Encyclopaedia of the Philosophical Sciences and the Elements of the Philosophy of Right (1820), plus lectures on history, art and religion.',
    legacy:
      'His idea that history moves through conflict and that we become who we are by being recognised by others shaped Marx, existentialism and modern social thought, even among people who never read him.',
  },
  marx: {
    overview:
      'A German philosopher and journalist who was expelled from several countries for his writing and spent most of his life in poverty in London, supported by his friend Friedrich Engels. He studied capitalism in the reading room of the British Museum to understand why workers stayed poor while wealth grew.',
    works:
      'The Communist Manifesto (1848, with Engels), the Economic and Philosophic Manuscripts of 1844 and Capital, Volume I (1867).',
    legacy:
      'Few thinkers have changed the world more. Political movements and governments claimed his name, with very different results. His ideas of alienation, class and how economic life shapes everything else remain central to sociology, history and economics.',
  },
  kierkegaard: {
    overview:
      'A Danish writer from Copenhagen who broke off his engagement to the woman he loved, quarrelled with the newspapers and attacked the comfortable church of his day. He wrote under many invented names to show different ways of living from the inside.',
    works:
      'Either/Or (1843), Fear and Trembling (1843), The Concept of Anxiety (1844), Concluding Unscientific Postscript (1846) and The Sickness unto Death (1849).',
    legacy:
      'Often called the father of existentialism, he insisted that the biggest questions are not puzzles to solve but choices each person must make and live. His writing on anxiety and despair still speaks to anyone facing a decision that defines them.',
  },
  nietzsche: {
    overview:
      'A German professor of classics at the age of twenty-four, who left his post through ill health and wrote his major books while wandering between Swiss and Italian towns. He collapsed in Turin in 1889 and spent his last eleven years unable to work.',
    works:
      'The Birth of Tragedy (1872), The Gay Science (1882), Thus Spoke Zarathustra (1883–85), Beyond Good and Evil (1886) and On the Genealogy of Morals (1887).',
    legacy:
      'His announcement that “God is dead”, and his question of what could give life meaning afterwards, shaped existentialism, psychology and literature. His sister later bent his work to suit German nationalism, a use he would have despised.',
  },
  rawls: {
    overview:
      'An American philosopher who served in the Pacific in the Second World War and taught at Harvard for decades. Quiet and modest, he spent twenty years writing one book, asking what rules a fair society would choose if no one knew in advance where they would end up in it.',
    works:
      'A Theory of Justice (1971), Political Liberalism (1993), The Law of Peoples (1999) and Justice as Fairness: A Restatement (2001).',
    legacy:
      'His veil of ignorance is one of the most famous thought experiments of the last century, and A Theory of Justice revived political philosophy. Arguments about welfare, inequality and fairness still start from him.',
  },
  nozick: {
    overview:
      'An American philosopher at Harvard, a colleague of Rawls, who wrote the most famous reply to him. He never wanted to be tied to one position, and moved on to write about knowledge, the meaning of life and what really matters.',
    works:
      'Anarchy, State, and Utopia (1974), Philosophical Explanations (1981), The Examined Life (1989) and Invariances (2001).',
    legacy:
      'His defence of a minimal state that respects individual rights became a founding text of libertarianism, and his experience machine thought experiment is one of the strongest arguments that pleasure is not all that matters.',
  },
  wittgenstein: {
    overview:
      'The son of one of the richest families in Vienna, he gave away his fortune, fought in the First World War, worked as a village schoolteacher and a gardener, and became a professor at Cambridge. He changed philosophy twice, with two very different books.',
    works:
      'The Tractatus Logico-Philosophicus (1921), the only book he published in his lifetime, and Philosophical Investigations (published 1953), which rejected much of his earlier view.',
    legacy:
      'His later idea that the meaning of a word is its use in everyday life, and that many philosophical problems come from language “going on holiday”, transformed philosophy of language, mind and even computing.',
  },
  popper: {
    overview:
      'A Viennese philosopher who left Austria as the Nazis rose, wrote his defence of democracy in New Zealand during the war, and later taught at the London School of Economics. He asked what separates real science from ideas that only pretend to be scientific.',
    works:
      'The Logic of Scientific Discovery (1934), The Open Society and Its Enemies (1945), The Poverty of Historicism (1957) and Conjectures and Refutations (1963).',
    legacy:
      'His falsifiability test, that a scientific theory must say what evidence would prove it wrong, is still how many scientists think about their work. The Open Society remains a classic defence of democracy against those who claim to know history’s plan.',
  },
  arendt: {
    overview:
      'A German-Jewish political thinker who was arrested by the Gestapo, escaped, was held in a French camp and reached New York in 1941. She spent her life trying to understand how totalitarianism happened, and what it takes for people to think and act freely together.',
    works:
      'The Origins of Totalitarianism (1951), The Human Condition (1958), Eichmann in Jerusalem (1963) and On Revolution (1963).',
    legacy:
      'Her phrase “the banality of evil”, from watching a Nazi organiser on trial, changed how we think about ordinary people taking part in terrible things. Her warnings about lies in politics and the loss of shared truth feel urgent today.',
  },
  berlin: {
    overview:
      'Born in Riga, he saw the Russian Revolution as a child, moved to England and became an Oxford philosopher and historian of ideas, famous as a brilliant talker. He worked in Washington for the British during the war.',
    works:
      'Essays rather than big books: “Two Concepts of Liberty” (1958), The Hedgehog and the Fox (1953), and essays on thinkers of the Enlightenment and its critics.',
    legacy:
      'His distinction between negative liberty (freedom from interference) and positive liberty (freedom to be your own master) is still basic to political debate, as is his view that real values can clash with no perfect answer.',
  },
  hayek: {
    overview:
      'An Austrian economist who served in the First World War and moved to the London School of Economics, where he argued for decades with Keynes. He believed no planner could ever know enough to run an economy, because the knowledge is spread among millions of people.',
    works:
      'The Road to Serfdom (1944), “The Use of Knowledge in Society” (1945), The Constitution of Liberty (1960) and Law, Legislation and Liberty (1973–79). He shared the Nobel Prize in economics in 1974.',
    legacy:
      'His idea that prices work as a signalling system, passing on knowledge no one person has, is central to economics. His warnings against central planning influenced governments from the 1980s onward.',
  },
  keynes: {
    overview:
      'An English economist at Cambridge, also a member of the Bloomsbury circle of artists and writers. He walked out of the peace talks after the First World War, predicting the punishing terms would wreck Europe, and later helped design the world’s economic system after the Second.',
    works:
      'The Economic Consequences of the Peace (1919), A Treatise on Probability (1921) and The General Theory of Employment, Interest and Money (1936).',
    legacy:
      'He showed that economies can get stuck in long slumps and that governments can spend to lift them out, an idea that shaped policy after the Great Depression and again in the 2008 financial crisis and the pandemic.',
  },
  sartre: {
    overview:
      'A French philosopher, novelist and playwright who was a prisoner of war in 1940 and wrote in Paris cafés during the occupation. He became the most famous intellectual in the world, and in 1964 turned down the Nobel Prize in Literature.',
    works:
      'Nausea (1938), Being and Nothingness (1943), the play No Exit (1944), the lecture Existentialism Is a Humanism (1946) and the Critique of Dialectical Reason (1960).',
    legacy:
      '“Existence precedes essence”: there is no fixed human nature, so we are responsible for what we make of ourselves. His idea of bad faith, pretending we have no choice, is still a sharp tool for honest self-examination.',
  },
  camus: {
    overview:
      'Born into poverty in French Algeria, he edited a Resistance newspaper in occupied Paris and won the Nobel Prize in Literature in 1957, at forty-four. He died in a car crash three years later, with an unfinished novel in his bag.',
    works:
      'The Stranger (1942), The Myth of Sisyphus (1942), The Plague (1947), The Rebel (1951) and The Fall (1956).',
    legacy:
      'He asked how to live in a world that offers no built-in meaning, and answered: with honesty, revolt and solidarity, without despair. “One must imagine Sisyphus happy” is one of philosophy’s most quoted lines.',
  },
  beauvoir: {
    overview:
      'A French philosopher and novelist who came second only to Sartre, her lifelong partner, in the national philosophy exam at twenty-one. She taught, wrote novels and memoirs, and became one of the most influential thinkers of the century.',
    works:
      'The Ethics of Ambiguity (1947), The Second Sex (1949), the novel The Mandarins (1954), which won the Prix Goncourt, a four-volume memoir and The Coming of Age (1970).',
    legacy:
      '“One is not born, but rather becomes, a woman.” The Second Sex launched modern feminist philosophy by showing how much of what is called natural is made by society.',
  },
  foucault: {
    overview:
      'A French philosopher and historian who studied psychology, worked in hospitals and taught in Sweden, Poland and Tunisia before becoming a professor at the Collège de France. He asked how institutions decide who counts as mad, sick, criminal or normal.',
    works:
      'History of Madness (1961), The Birth of the Clinic (1963), The Order of Things (1966), Discipline and Punish (1975) and the History of Sexuality (1976–84).',
    legacy:
      'His idea that power works not only through force but through knowledge, surveillance and the categories we live by is now used across history, law, medicine and the study of social media and data.',
  },
  fanon: {
    overview:
      'Born in Martinique, he fought for Free France in the Second World War, trained as a psychiatrist in France and ran a hospital in Algeria, where he joined the fight for independence. He died of leukaemia at thirty-six.',
    works:
      'Black Skin, White Masks (1952), A Dying Colonialism (1959) and The Wretched of the Earth (1961).',
    legacy:
      'He showed how colonialism damages the minds as well as the lives of the colonised. His work is central to postcolonial thought, anti-racism and the psychology of identity.',
  },
  confucius: {
    overview:
      'A teacher from the small state of Lu in China, during a time of disorder and war between states. He held minor posts in government, then travelled for years looking for a ruler who would govern by virtue, and returned home to teach.',
    works:
      'The Analects, a collection of his sayings and conversations put together by his followers after his death. Tradition also links him to the editing of older classics such as the Book of Songs.',
    legacy:
      'For more than two thousand years his ideas of respect within families, self-cultivation, ritual and humane government shaped China, Korea, Japan and Vietnam, and they remain a living ethical tradition today.',
  },
  mencius: {
    overview:
      'A Chinese philosopher born about a century after Confucius, who travelled from court to court advising rulers. Tradition says his mother moved house three times to give him a good upbringing. He defended the Confucian way against rival schools.',
    works:
      'The Mencius, a book of his conversations with rulers, students and opponents, later made one of the Four Books every Chinese scholar studied.',
    legacy:
      'His belief that human nature is good, illustrated by anyone’s urge to save a child about to fall into a well, is still a key position in debates about moral psychology, and his view that rulers who harm the people lose the right to rule was radical.',
  },
  laozi: {
    overview:
      'A figure half history and half legend, traditionally said to be a keeper of archives at the Zhou court, older than Confucius. The story goes that he left China riding an ox, and a border guard asked him to write down his wisdom before he went.',
    works:
      'The Daodejing (Tao Te Ching), a short book of 81 poetic chapters about the Dao, the Way of things, probably gathered from several sources over time.',
    legacy:
      'It is one of the most translated books in the world. Its ideas of effortless action (wu wei), softness overcoming hardness and leaders who rule lightly have shaped Daoism, Chinese art and modern ideas about leadership and nature.',
  },
  buddha: {
    overview:
      'Siddhartha Gautama, a prince in what is now Nepal, left his comfortable life after seeing old age, sickness and death. After years of searching he reached awakening, “Buddha” means awakened one, and spent the next forty-five years teaching.',
    works:
      'He wrote nothing down. His teachings were memorised and passed on by his followers and later written in the Pali Canon and other collections of sutras.',
    legacy:
      'His Four Noble Truths and the Eightfold Path founded Buddhism, now followed by hundreds of millions. His insight that craving causes suffering, and his practice of mindfulness, have deeply influenced modern psychology.',
  },
  ibnrushd: {
    overview:
      'Ibn Rushd, known in Europe as Averroes, was a judge, doctor and philosopher in Córdoba in Muslim Spain. Asked by the ruler to explain Aristotle, he wrote commentaries so thorough that Europeans called him simply “the Commentator”.',
    works:
      'Commentaries on nearly all of Aristotle, The Incoherence of the Incoherence (a defence of philosophy against al-Ghazali), the Decisive Treatise on faith and reason, and a medical encyclopedia.',
    legacy:
      'He argued that true philosophy and true religion cannot contradict each other. His commentaries brought Aristotle back into Europe and shaped the universities of Paris and Padua.',
  },
  singer: {
    overview:
      'An Australian philosopher who teaches at Princeton. As a graduate student at Oxford, a lunchtime conversation with a vegetarian friend led him to examine how we treat animals, and he began writing the arguments that made him the best known, and among the most controversial, moral philosophers alive.',
    works:
      '“Famine, Affluence, and Morality” (1972), Animal Liberation (1975), Practical Ethics (1979) and The Life You Can Save (2009).',
    legacy:
      'His drowning-child argument, that if you can prevent great suffering at small cost you must, inspired the effective altruism movement. Animal Liberation launched the modern animal rights movement.',
  },
  nussbaum: {
    overview:
      'An American philosopher, trained in classics, who teaches law and philosophy at the University of Chicago. She has written on Greek tragedy, emotions, justice and disability, and believes emotions are a form of intelligence, not its enemy.',
    works:
      'The Fragility of Goodness (1986), Upheavals of Thought (2001), Frontiers of Justice (2006) and Creating Capabilities (2011).',
    legacy:
      'With Amartya Sen she developed the capabilities approach, judging a society by what its people are actually able to do and to be. It has shaped how the United Nations and governments measure human development.',
  },
  thomson: {
    overview:
      'An American philosopher who taught at MIT for most of her career. She was famous for short, sharp thought experiments that tested what people say they believe about rights, killing and letting die.',
    works:
      '“A Defense of Abortion” (1971), with its violinist case, “Killing, Letting Die, and the Trolley Problem” (1976), which gave the puzzle its name, “The Trolley Problem” (1985) and The Realm of Rights (1990).',
    legacy:
      'She made the trolley problem famous and later changed her own mind about it, which is part of why it is still argued over. Her violinist argument remains one of the most discussed papers in applied ethics.',
  },
  sen: {
    overview:
      'An Indian economist and philosopher who, as a boy, saw the Bengal famine of 1943 that killed millions. He spent his life asking why famines happen and how to judge whether people’s lives are really going well, teaching at Delhi, Oxford and Harvard.',
    works:
      'Poverty and Famines (1981), Inequality Reexamined (1992), Development as Freedom (1999) and The Idea of Justice (2009). He won the Nobel Prize in economics in 1998.',
    legacy:
      'He showed that famines are usually caused by people losing the ability to buy food, not by a lack of food, and that they do not happen in working democracies. His capabilities approach helped create the UN’s Human Development Index.',
  },
  parfit: {
    overview:
      'An English philosopher who spent his whole career at All Souls College, Oxford, famous for working almost without pause and for his photographs of Venice and St Petersburg. He wrote about personal identity, future generations and whether morality is objective.',
    works:
      'Reasons and Persons (1984) and the three-volume On What Matters (2011–17).',
    legacy:
      'His argument that personal identity matters less than we think, and his work on our duties to people who do not yet exist, changed thinking about the self and shaped debates about climate change and the long-term future.',
  },
  anscombe: {
    overview:
      'An English philosopher, a student and close friend of Wittgenstein and his translator, and a professor at Cambridge. A mother of seven, she was known for her fierce arguments and for publicly opposing Oxford’s honorary degree for President Truman, who ordered the atomic bombings of Japan.',
    works:
      'Intention (1957), the essay “Modern Moral Philosophy” (1958) and her translation of Wittgenstein’s Philosophical Investigations (1953).',
    legacy:
      '“Modern Moral Philosophy” coined the word consequentialism and launched the revival of virtue ethics. Her book Intention founded the modern study of what it means to act on purpose.',
  },
}
