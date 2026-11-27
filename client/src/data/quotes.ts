/**
 * Lines for the ticker beneath the Sanctuary. Kept to what each thinker
 * actually wrote or said (in common English translation); popular
 * misattributions are left out on purpose.
 */
export const QUOTES: [string, string][] = [
  ['The unexamined life is not worth living.', 'SOCRATES'],
  ['I neither know nor think that I know.', 'SOCRATES'],
  ['Wonder is the feeling of a philosopher, and philosophy begins in wonder.', 'PLATO'],
  ['The beginning is the most important part of the work.', 'PLATO'],
  ['All men by nature desire to know.', 'ARISTOTLE'],
  ['Man is by nature a political animal.', 'ARISTOTLE'],
  ['Character is destiny.', 'HERACLITUS'],
  ['Death is nothing to us.', 'EPICURUS'],
  ['It is not things that disturb us, but our judgements about things.', 'EPICTETUS'],
  ['We suffer more often in imagination than in reality.', 'SENECA'],
  ['Waste no more time arguing about what a good man should be. Be one.', 'MARCUS AURELIUS'],
  ['Our heart is restless until it rests in you.', 'AUGUSTINE'],
  ['Grace does not destroy nature, but perfects it.', 'AQUINAS'],
  ['The truth does not contradict the truth; it agrees with it and bears witness to it.', 'IBN RUSHD'],
  ['To know what you know and to know what you do not know, that is true knowledge.', 'CONFUCIUS'],
  ['All men have a mind which cannot bear to see the sufferings of others.', 'MENCIUS'],
  ['The Way that can be told is not the eternal Way.', 'LAOZI'],
  ['A journey of a thousand miles begins beneath one’s feet.', 'LAOZI'],
  ['Hatred is never appeased by hatred. By non-hatred alone is hatred appeased.', 'THE BUDDHA'],
  ['It is much safer to be feared than loved, if one must choose.', 'MACHIAVELLI'],
  ['What do I know?', 'MONTAIGNE'],
  ['I think, therefore I am.', 'DESCARTES'],
  ['The heart has its reasons which reason does not know.', 'PASCAL'],
  ['The life of man, solitary, poor, nasty, brutish, and short.', 'HOBBES'],
  ['Where there is no law, there is no freedom.', 'LOCKE'],
  ['Reason is, and ought only to be the slave of the passions.', 'HUME'],
  ['Man is born free, and everywhere he is in chains.', 'ROUSSEAU'],
  ['Sapere aude. Have courage to use your own understanding.', 'KANT'],
  ['The starry heavens above me and the moral law within me.', 'KANT'],
  ['It is not from the benevolence of the butcher, the brewer, or the baker that we expect our dinner.', 'ADAM SMITH'],
  ['A partnership between those who are living, those who are dead, and those who are to be born.', 'EDMUND BURKE'],
  ['I do not wish them to have power over men; but over themselves.', 'MARY WOLLSTONECRAFT'],
  ['It is the greatest happiness of the greatest number that is the measure of right and wrong.', 'BENTHAM'],
  ['The owl of Minerva spreads its wings only with the falling of the dusk.', 'HEGEL'],
  ['Better to be Socrates dissatisfied than a fool satisfied.', 'J. S. MILL'],
  ['Over himself, over his own body and mind, the individual is sovereign.', 'J. S. MILL'],
  ['Life can only be understood backwards; but it must be lived forwards.', 'KIERKEGAARD'],
  ['Anxiety is the dizziness of freedom.', 'KIERKEGAARD'],
  ['The philosophers have only interpreted the world; the point is to change it.', 'MARX'],
  ['He who has a why to live can bear almost any how.', 'NIETZSCHE'],
  ['God is dead. God remains dead. And we have killed him.', 'NIETZSCHE'],
  ['The limits of my language mean the limits of my world.', 'WITTGENSTEIN'],
  ['Whereof one cannot speak, thereof one must be silent.', 'WITTGENSTEIN'],
  ['Our knowledge can only be finite, while our ignorance must necessarily be infinite.', 'POPPER'],
  ['In the long run we are all dead.', 'KEYNES'],
  ['Man is condemned to be free.', 'SARTRE'],
  ['Hell is other people.', 'SARTRE'],
  ['One must imagine Sisyphus happy.', 'CAMUS'],
  ['One is not born, but rather becomes, a woman.', 'SIMONE DE BEAUVOIR'],
  ['The banality of evil.', 'HANNAH ARENDT'],
  ['Freedom for the wolves has often meant death to the sheep.', 'ISAIAH BERLIN'],
  ['Where there is power, there is resistance.', 'FOUCAULT'],
  ['Each generation must, out of relative obscurity, discover its mission, fulfil it, or betray it.', 'FRANTZ FANON'],
  ['Justice is the first virtue of social institutions.', 'RAWLS'],
  ['Individuals have rights, and there are things no person or group may do to them.', 'NOZICK'],
  ['If it is in our power to prevent something bad from happening, without sacrificing anything of comparable moral importance, we ought to do it.', 'PETER SINGER'],
  ['When I changed my view, the walls of my glass tunnel disappeared.', 'DEREK PARFIT'],
  ['Poverty must be seen as the deprivation of basic capabilities, rather than merely as lowness of income.', 'AMARTYA SEN'],
]

/** The quotes in an order that changes each day, so the ticker rarely repeats itself. */
export function quotesForToday(): [string, string][] {
  const d = new Date()
  let seed = d.getFullYear() * 1000 + d.getMonth() * 40 + d.getDate()
  const r = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  const out = QUOTES.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
