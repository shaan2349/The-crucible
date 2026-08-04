export interface Philosopher {
  id: string
  name: string
  era: string
  framework: string
  attack: string
}

export const PHILOSOPHERS: Philosopher[] = [
  { id: 'socrates', name: 'Socrates', era: 'Ancient Greece, c.470–399 BCE', framework: 'Elenctic method — believes unexamined premises are the root of all bad reasoning', attack: "Asks relentless clarifying questions until the person's own definitions contradict themselves" },
  { id: 'plato', name: 'Plato', era: 'Ancient Greece, c.428–348 BCE', framework: 'Theory of Forms — true knowledge is of eternal, unchanging truths, not appearances', attack: 'Attacks arguments that rest on opinion, appearance, or majority sentiment rather than objective truth' },
  { id: 'aristotle', name: 'Aristotle', era: 'Ancient Greece, 384–322 BCE', framework: 'Virtue ethics — the good life is one of flourishing (eudaimonia) through virtuous habit', attack: 'Attacks arguments that reduce ethics to pure rules or pure outcomes, ignoring character and context' },
  { id: 'epicurus', name: 'Epicurus', era: 'Ancient Greece, 341–270 BCE', framework: 'Hedonism tempered by tranquility — pleasure is the good, but the deepest pleasure is freedom from disturbance', attack: 'Attacks arguments driven by unnecessary fear or unbounded desire' },
  { id: 'marcus', name: 'Marcus Aurelius', era: 'Rome, 121–180 CE, Stoic', framework: 'Stoicism — virtue is the only true good; focus only on what is in your control', attack: 'Attacks arguments that hinge on things outside the person\'s control, or on resisting fate' },
  { id: 'augustine', name: 'Augustine', era: 'Roman North Africa, 354–430 CE', framework: 'Christian Neoplatonism — true good is oriented toward God; evil is a privation, not a substance', attack: 'Attacks purely secular or self-sufficient accounts of morality and free will' },
  { id: 'aquinas', name: 'Aquinas', era: 'Medieval Italy, 1225–1274', framework: "Natural law — morality is grounded in humanity's God-given rational purpose (telos)", attack: 'Attacks arguments detached from human purpose, or that treat law as arbitrary convention' },
  { id: 'descartes', name: 'Descartes', era: 'France, 1596–1650', framework: 'Rationalism — knowledge must be rebuilt from indubitable foundations (cogito ergo sum)', attack: 'Attacks claims resting on unexamined assumptions rather than certain foundations' },
  { id: 'hobbes', name: 'Hobbes', era: 'England, 1588–1679', framework: "Social contract, pessimistic human nature — life without authority is 'nasty, brutish, and short'", attack: 'Attacks optimistic assumptions about human cooperation absent strong authority' },
  { id: 'locke', name: 'Locke', era: 'England, 1632–1704', framework: 'Natural rights liberalism — life, liberty, property are inalienable; government exists by consent', attack: 'Attacks arguments that violate natural rights or lack the consent of the governed' },
  { id: 'hume', name: 'Hume', era: 'Scotland, 1711–1776', framework: "Empiricism and skepticism — knowledge comes from experience; reason is 'slave to the passions'", attack: "Attacks unwarranted causal claims and any leap from 'is' to 'ought'" },
  { id: 'rousseau', name: 'Rousseau', era: 'Geneva/France, 1712–1778', framework: 'General will — legitimate authority flows from the collective will, corrupted by society', attack: 'Attacks arguments that ignore the general will or defend inequality as natural' },
  { id: 'kant', name: 'Kant', era: 'Prussia, 1724–1804', framework: 'Deontology — act only on maxims you could will as universal law; treat persons as ends, never merely means', attack: 'Attacks consequentialist reasoning and any argument that instrumentalizes people' },
  { id: 'smith', name: 'Adam Smith', era: 'Scotland, 1723–1790', framework: 'Classical economics — self-interest, channeled through markets, produces social benefit', attack: 'Attacks arguments that ignore incentives or market dynamics' },
  { id: 'machiavelli', name: 'Machiavelli', era: 'Florence, 1469–1527', framework: 'Political realism — effective rule requires understanding power as it is', attack: 'Attacks naively moralistic arguments about leadership that ignore what power requires' },
  { id: 'burke', name: 'Edmund Burke', era: 'Ireland/England, 1729–1797', framework: 'Conservatism — inherited institutions embody accumulated wisdom', attack: 'Attacks arguments for radical change that discard tradition without accounting for its function' },
  { id: 'wollstonecraft', name: 'Mary Wollstonecraft', era: 'England, 1759–1797', framework: 'Early liberal feminism — reason and rights are not gendered', attack: "Attacks arguments that naturalize women's exclusion from reason, rights, or education" },
  { id: 'bentham', name: 'Bentham', era: 'England, 1748–1832', framework: 'Classical utilitarianism — the right act maximizes aggregate pleasure, calculated systematically', attack: 'Attacks anything that resists being reduced to a calculation of aggregate utility' },
  { id: 'mill', name: 'Mill', era: 'England, 1806–1873', framework: 'Refined utilitarianism and liberty — protect individual liberty from paternalism', attack: 'Attacks rigid rule-following that produces bad outcomes, and paternalistic restriction of liberty' },
  { id: 'hegel', name: 'Hegel', era: 'Prussia, 1770–1831', framework: 'Dialectical idealism — thought progresses through contradiction', attack: 'Attacks static positions, pushing toward the contradiction the view is repressing' },
  { id: 'marx', name: 'Marx', era: 'Prussia/England, 1818–1883', framework: 'Historical materialism — ideas and morality are shaped by class and economic structure', attack: 'Attacks arguments that treat current class arrangements as natural or neutral' },
  { id: 'kierkegaard', name: 'Kierkegaard', era: 'Denmark, 1813–1855', framework: 'Existentialism/faith — truth is subjective; the highest life requires a leap of faith', attack: 'Attacks arguments hiding behind pure reason or crowd-conformity' },
  { id: 'nietzsche', name: 'Nietzsche', era: 'Germany, 1844–1900', framework: 'Will to power, master/slave morality', attack: 'Exposes the hidden resentment or herd-instinct behind a stated moral position' },
  { id: 'rawls', name: 'Rawls', era: 'USA, 1921–2002', framework: "Justice as fairness — chosen behind a 'veil of ignorance'", attack: "Attacks arguments that ignore the worst-off, or wouldn't be chosen behind the veil" },
  { id: 'nozick', name: 'Nozick', era: 'USA, 1938–2002', framework: 'Libertarianism — strong entitlement rights', attack: 'Attacks arguments for redistribution or state overreach that violate entitlement' },
  { id: 'wittgenstein', name: 'Wittgenstein', era: 'Austria/England, 1889–1951', framework: "Many 'problems' are confusions produced by the misuse of language", attack: 'Attacks the framing of the question itself as a confused use of language' },
  { id: 'popper', name: 'Popper', era: 'Austria/England, 1902–1994', framework: 'Falsificationism — a claim is only rigorous if it could be proven false', attack: 'Attacks unfalsifiable claims or ones that dodge counter-evidence' },
  { id: 'arendt', name: 'Hannah Arendt', era: 'Germany/USA, 1906–1975', framework: "Evil often becomes systemic and 'banal' rather than monstrous", attack: 'Attacks arguments that treat harm as only individual, ignoring systemic evil' },
  { id: 'berlin', name: 'Isaiah Berlin', era: 'Latvia/England, 1909–1997', framework: 'Negative liberty (freedom from) vs positive liberty (freedom to) are distinct', attack: 'Attacks arguments that conflate negative and positive liberty' },
  { id: 'hayek', name: 'Hayek', era: 'Austria/England, 1899–1992', framework: 'Markets aggregate distributed knowledge no central planner can access', attack: 'Attacks arguments for central planning that assume planners have sufficient information' },
  { id: 'keynes', name: 'Keynes', era: 'England, 1883–1946', framework: 'Markets can fail to self-correct; the state should manage demand', attack: 'Attacks arguments assuming markets self-correct without intervention' },
  { id: 'sartre', name: 'Sartre', era: 'France, 1905–1980', framework: "Existence precedes essence; humans are 'condemned to be free'", attack: "Attacks 'bad faith' — denying freedom and responsibility by blaming circumstance" },
  { id: 'camus', name: 'Camus', era: 'France/Algeria, 1913–1960', framework: 'Absurdism — life has no inherent meaning; live fully within the absurd', attack: 'Attacks arguments that impose a false, comforting resolution onto absurdity' },
  { id: 'beauvoir', name: 'Simone de Beauvoir', era: 'France, 1908–1986', framework: "'One is not born, but becomes, a woman' — gender roles are constructed", attack: 'Attacks arguments that treat gendered hierarchies as natural or fixed' },
  { id: 'foucault', name: 'Foucault', era: 'France, 1926–1984', framework: "What counts as 'truth' or 'normal' is shaped by institutional power", attack: 'Attacks claims to neutral truth that ignore the power structures producing them' },
  { id: 'fanon', name: 'Frantz Fanon', era: 'Martinique/Algeria, 1925–1961', framework: 'Colonialism structures identity, psychology, and what counts as \'rational\'', attack: 'Attacks arguments that present colonial power arrangements as neutral or universal' },
  { id: 'confucius', name: 'Confucius', era: 'China, 551–479 BCE', framework: 'Virtue is cultivated through duty, ritual, and social harmony', attack: 'Attacks arguments built purely on individual rights that ignore relational duty' },
  { id: 'mencius', name: 'Mencius', era: 'China, c.372–289 BCE', framework: 'Human nature is fundamentally good; virtue is cultivated, not imposed', attack: 'Attacks Hobbesian arguments that humans are naturally selfish' },
  { id: 'laozi', name: 'Laozi', era: 'China, c.6th century BCE, Daoist', framework: 'Wisest action is often non-action (wu wei)', attack: 'Attacks arguments that favor forceful solutions over natural, minimal ones' },
  { id: 'buddha', name: 'Buddha', era: 'Ancient India, c.5th century BCE', framework: 'Suffering arises from attachment and craving', attack: 'Attacks arguments rooted in attachment or aversion as the cause of the conflict' },
  { id: 'ibnrushd', name: 'Ibn Rushd (Averroes)', era: 'Al-Andalus, 1126–1198', framework: 'Reason and religious faith are ultimately compatible', attack: 'Attacks arguments that assume reason and faith must be irreconcilable' },
  { id: 'singer', name: 'Peter Singer', era: 'Australia, b.1946', framework: 'Suffering matters equally regardless of species', attack: 'Attacks arguments that ignore the suffering of all sentient beings' },
  { id: 'nussbaum', name: 'Martha Nussbaum', era: 'USA, b.1947', framework: 'Capabilities approach — justice measured by what people can actually do and be', attack: 'Attacks arguments that measure a good life purely by wealth or aggregate utility' },
  { id: 'thomson', name: 'Judith Jarvis Thomson', era: 'USA, 1929–2020', framework: 'Moral intuitions tested through careful analogous thought experiments', attack: "Attacks an argument via a closely analogous case that breaks the person's reasoning" },
  { id: 'sen', name: 'Amartya Sen', era: 'India, b.1933', framework: 'Real freedom requires actual capability, not just formal rights', attack: 'Attacks arguments that treat formal legal justice as sufficient' },
  { id: 'parfit', name: 'Derek Parfit', era: 'England, 1942–2017', framework: 'Personal identity is less fixed than we assume', attack: 'Attacks arguments relying on a fixed, continuous notion of personal identity' },
  { id: 'anscombe', name: 'Elizabeth Anscombe', era: 'England, 1919–2001', framework: 'Moral language needs grounding in intention and character', attack: 'Attacks consequentialist language detached from real intention and virtue' },
]

/**
 * Short standard-label tag per philosopher, for a quick-scan pill in the
 * Library — derived directly from each entry's `framework` text above
 * (e.g. Kant's framework already says "Deontology"), not a separate claim.
 */
export const PHILOSOPHER_TAGS: Record<string, string> = {
  socrates: 'Elenctic Method',
  plato: 'Idealism',
  aristotle: 'Virtue Ethics',
  epicurus: 'Hedonism',
  marcus: 'Stoicism',
  augustine: 'Christian Neoplatonism',
  aquinas: 'Natural Law',
  descartes: 'Rationalism',
  hobbes: 'Social Contract',
  locke: 'Liberalism',
  hume: 'Empiricism',
  rousseau: 'Social Contract',
  kant: 'Deontology',
  smith: 'Classical Economics',
  machiavelli: 'Political Realism',
  burke: 'Conservatism',
  wollstonecraft: 'Liberal Feminism',
  bentham: 'Utilitarianism',
  mill: 'Utilitarianism',
  hegel: 'Dialectical Idealism',
  marx: 'Historical Materialism',
  kierkegaard: 'Existentialism',
  nietzsche: 'Will to Power',
  rawls: 'Justice as Fairness',
  nozick: 'Libertarianism',
  wittgenstein: 'Ordinary Language',
  popper: 'Falsificationism',
  arendt: 'Political Theory',
  berlin: 'Liberty Pluralism',
  hayek: 'Classical Liberalism',
  keynes: 'Keynesian Economics',
  sartre: 'Existentialism',
  camus: 'Absurdism',
  beauvoir: 'Existentialist Feminism',
  foucault: 'Post-Structuralism',
  fanon: 'Anti-Colonial Theory',
  confucius: 'Virtue Ethics',
  mencius: 'Confucianism',
  laozi: 'Daoism',
  buddha: 'Buddhist Philosophy',
  ibnrushd: 'Islamic Rationalism',
  singer: 'Utilitarianism',
  nussbaum: 'Capabilities Approach',
  thomson: 'Analytic Ethics',
  sen: 'Capabilities Approach',
  parfit: 'Personal Identity Theory',
  anscombe: 'Virtue Ethics',
}

export const PHILOSOPHER_CATEGORIES = [
  { name: 'Ancient', ids: ['socrates', 'plato', 'aristotle', 'epicurus', 'marcus'] },
  { name: 'Medieval', ids: ['augustine', 'aquinas'] },
  { name: 'Enlightenment & Early Modern', ids: ['descartes', 'hobbes', 'locke', 'hume', 'rousseau', 'kant', 'smith', 'machiavelli', 'burke', 'wollstonecraft'] },
  { name: '19th Century', ids: ['bentham', 'mill', 'hegel', 'marx', 'kierkegaard', 'nietzsche'] },
  { name: '20th Century Political & Analytic', ids: ['rawls', 'nozick', 'wittgenstein', 'popper', 'arendt', 'berlin', 'hayek', 'keynes'] },
  { name: 'Existentialist & Continental', ids: ['sartre', 'camus', 'beauvoir', 'foucault', 'fanon'] },
  { name: 'Eastern', ids: ['confucius', 'mencius', 'laozi', 'buddha', 'ibnrushd'] },
  { name: 'Contemporary', ids: ['singer', 'nussbaum', 'thomson', 'sen', 'parfit', 'anscombe'] },
] as const

export const SUGGESTED_TOPICS = [
  { short: 'Dad thinks philosophy is a waste of time', label: "My dad thinks I should drop philosophy for something 'practical' — but I think it's worth studying anyway" },
  { short: "A good God wouldn't allow this suffering", label: 'A good God would not allow this much suffering in the world' },
  { short: 'Staying silent makes you complicit', label: 'A friend copied my homework — I think staying quiet about it makes me complicit' },
  { short: 'AI needs tight regulation', label: 'AI should be tightly regulated by governments' },
  { short: 'Inheritance tax is unjust', label: 'Inheritance tax is fundamentally unjust' },
  { short: "Study what you love, not 'safe'", label: "My parents want me to pick a 'safe' degree — I think you should study what you actually love" },
  { short: 'No free will, no real punishment', label: 'Free will is an illusion, so punishment can never be truly justified' },
  { short: 'Eating meat is now unjustifiable', label: "It's wrong to eat meat now that plant-based alternatives exist" },
  { short: 'Lying to protect someone was right', label: 'I lied to a friend to protect their feelings, and I think that was the right call' },
  { short: 'Countries can rightly close borders', label: "A country has the right to close its borders to protect its own citizens' interests" },
]

export function philosopherById(id: string): Philosopher | undefined {
  return PHILOSOPHERS.find((p) => p.id === id)
}

export function initials(name: string): string {
  const clean = name.replace(/\(.*?\)/g, '').trim()
  const parts = clean.split(' ').filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Portraits, keyed by philosopher id rather than a flat list, so a
 * specific debate can show its two actual combatants instead of a random
 * pair. Filenames are real Wikimedia Commons files (verified during
 * prototyping via search — not verifiable from this dev environment,
 * whose network policy blocks Wikipedia entirely). Resolved through
 * Wikipedia's Special:FilePath redirect, which finds the file regardless
 * of which Commons subdirectory it lives in. Each is preloaded before use
 * and falls back to a Bust illustration on failure (see
 * useRotatingBackground / usePortrait), so a renamed/deleted file, or a
 * philosopher not yet in this map, degrades gracefully instead of
 * breaking the layout. Only 10 of 47 are covered so far — extend as more
 * filenames are verified.
 */
export const PHILOSOPHER_PHOTOS: Record<string, string> = {
  socrates: 'Socrates Louvre.jpg',
  plato: 'Plato Silanion Musei Capitolini MC1377.jpg',
  aristotle: 'Aristotle Altemps Inv8575.jpg',
  epicurus: 'Epicurus Massimo Inv197306.jpg',
  marcus: 'Marcus Aurelius Louvre MR561 n02.jpg',
  augustine: 'Saint Augustine by Philippe de Champaigne.jpg',
  aquinas: 'St-thomas-aquinasFXD.jpg',
  descartes: 'Frans Hals - Portret van René Descartes.jpg',
  hobbes: 'Thomas Hobbes (portrait).jpg',
  locke: 'JohnLocke.png',
  hume: 'David Hume Ramsay.jpg',
  rousseau: 'Jean-Jacques Rousseau (painted portrait).jpg',
  kant: 'Immanuel_Kant_(painted_portrait).jpg',
  smith: 'AdamSmith.jpg',
  machiavelli: 'Portrait of Niccolò Machiavelli by Santi di Tito.jpg',
  burke: 'Sir Joshua Reynolds - Edmund Burke, 1729 - 1797. Statesman, orator and author - PG 2362 - National Galleries of Scotland.jpg',
  wollstonecraft: 'Mary Wollstonecraft by John Opie (c. 1797).jpg',
  bentham: 'Jeremy Bentham by Henry William Pickersgill detail.jpg',
  mill: 'John Stuart Mill by London Stereoscopic Company, c1870.jpg',
  hegel: 'Jakob Schlesinger - Hegel 1831.jpg',
  marx: 'Karl Marx 001 restored.jpg',
  kierkegaard: 'Søren Kierkegaard (1813-1855) - (cropped).jpg',
  nietzsche: 'Nietzsche187a.jpg',
  rawls: 'John Rawls (1971 photo portrait).jpg',
  nozick: 'Robert Nozick 1977 Libertarian Review cover.jpg',
  wittgenstein: 'Ludwig Wittgenstein.jpg',
  popper: 'Karl Popper.jpg',
  arendt: 'Hannah Arendt 1975 (cropped).jpg',
  berlin: 'IsaiahBerlin1983.jpg',
  hayek: 'Friedrich Hayek portrait.jpg',
  keynes: 'Keynes 1933.jpg',
  sartre: 'Jean Paul Sartre 1967.jpg',
  camus: 'Albert Camus, gagnant de prix Nobel, portrait en buste, posé au bureau, faisant face à gauche, cigarette de tabagisme.jpg',
  beauvoir: 'Simone de Beauvoir2.png',
  foucault: 'Michel Foucault 1974 Brasil.jpg',
  confucius: 'Confucius, fresco from a Western Han tomb of Dongping County, Shandong province, China.jpg',
  mencius: 'Half Portraits of the Great Sage and Virtuous Men of Old - Meng Ke (孟軻).jpg',
  laozi: 'Zhang Lu-Laozi Riding an Ox (cropped).jpg',
  buddha: 'Buddha in Sarnath Museum (Dhammajak Mutra).jpg',
  ibnrushd: 'Statue of Averroes in Córdoba, Spain.jpg',
  singer: 'Peter Singer 2017 (cropped).jpg',
  nussbaum: 'Martha Nussbaum wikipedia 10-10.jpg',
  thomson: 'Judith_Jarvis_Thomson,_philosopher_(1929_-_2020).jpg',
  sen: 'Amartya Sen 2012.jpg',
  anscombe: 'Elisabeth Anscombe.jpg',
}

export const BG_FILES = Object.values(PHILOSOPHER_PHOTOS)

export function wikimediaFilePath(name: string): string {
  return `https://en.wikipedia.org/wiki/Special:FilePath/${encodeURIComponent(name)}`
}

/** The two opposing accent colors used throughout a debate: gold vs. indigo. */
export const SIDE_ACCENT = ['#9c6a16', '#4b3a82'] as const
