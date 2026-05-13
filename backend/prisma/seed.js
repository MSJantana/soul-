const { hashPassword } = require("../src/lib/password");
const { getPeriodKey } = require("../src/utils/periodKey");

function normalizePeriod(period) {
  if (period === "WEEK") return "SEMANAL";
  if (period === "MONTH") return "MES";
  if (period === "QUARTER") return "QUADRIENAL";
  if (period === "SEMESTER") return "SEMESTRAL";
  if (period === "SEMETRAL") return "SEMESTRAL";
  if (period === "YEAR") return "ANO";
  return period;
}

const soulPlusActivities = [
  {
    slug: "quiz-escola-sabatina",
    title: "Quiz da Escola Sabatina",
    description: "Preenchimento e estudo diário da lição para participação no quiz semanal.",
    period: "WEEK",
    area: "DISCIPLINAS",
    points: 10,
    isActive: true,
  },
  {
    slug: "fidelidade-dizimos-ofertas",
    title: "Fidelidade (Dízimos e Ofertas)",
    description: "Devolução regular através do envelope físico ou aplicativo 7Me.",
    period: "WEEK",
    area: "DISCIPLINAS",
    points: 10,
    isActive: true,
  },
  {
    slug: "presenca-ativa",
    title: "Presença Ativa",
    description: "Participação pontual nas reuniões de sábado pela manhã.",
    period: "WEEK",
    area: "DISCIPLINAS",
    points: 8,
    isActive: true,
  },
  {
    slug: "jogo-legado-28",
    title: "Jogo Legado 28",
    description: "Reunião mensal para jogar e aprender doutrinas bíblicas de forma lúdica.",
    period: "MONTH",
    area: "CELEBRACAO",
    points: 15,
    isActive: true,
  },
  {
    slug: "encontro-celebracao-distrital",
    title: "Encontro de Celebração Distrital",
    description: "Participação em grande encontro com os pré-adolescentes do distrito (1x por semestre).",
    period: "SEMESTER",
    area: "CELEBRACAO",
    points: 25,
    isActive: true,
  },
  {
    slug: "ministrar-estudo-biblico",
    title: "Ministrar Estudo Bíblico",
    description:
      "Pelo menos um pré-adolescente ministrando a verdade bíblica para um amigo/interessado por trimestre.",
    period: "QUARTER",
    area: "LIDERANCA",
    points: 30,
    isActive: true,
  },
  {
    slug: "pg-ativo",
    title: "PG Ativo",
    description: "Participação e engajamento nas reuniões do Pequeno Grupo.",
    period: "QUARTER",
    area: "LIDERANCA",
    points: 20,
    isActive: true,
  },
  {
    slug: "encontro-de-familias",
    title: "Encontro de Famílias",
    description: "Evento especial (social ou espiritual) envolvendo pais e filhos 1x por trimestre.",
    period: "QUARTER",
    area: "FAMILIA",
    points: 25,
    isActive: true,
  },
  {
    slug: "arrecadacao-alimentos",
    title: "Arrecadação de alimentos",
    description: "Arrecadação e ação prática no trimestre.",
    period: "QUARTER",
    area: "MISSAO_SOCIAL",
    points: 20,
    isActive: true,
  },
  {
    slug: "coleta-higiene-escolar",
    title: "Coleta de materiais de higiene e escolar",
    description: "Arrecadação e ação prática no trimestre.",
    period: "QUARTER",
    area: "MISSAO_SOCIAL",
    points: 20,
    isActive: true,
  },
  {
    slug: "visita-asilos-orfanatos",
    title: "Visita a asilos ou orfanatos",
    description: "Ação prática de serviço no trimestre.",
    period: "QUARTER",
    area: "MISSAO_SOCIAL",
    points: 25,
    isActive: true,
  },
  {
    slug: "entrega-donativos-instituicoes",
    title: "Entrega de donativos a instituições carentes",
    description: "Ação prática de serviço no trimestre.",
    period: "QUARTER",
    area: "MISSAO_SOCIAL",
    points: 20,
    isActive: true,
  },
  {
    slug: "dez-dias-oracao",
    title: "10 Dias de Oração",
    description: "Participação nos cultos de madrugada ou correntes de oração.",
    period: "YEAR",
    area: "EVENTOS_IGREJA",
    points: 15,
    isActive: true,
  },
  {
    slug: "semana-santa",
    title: "Semana Santa",
    description: "Envolvimento na recepção ou encenação dos programas.",
    period: "YEAR",
    area: "EVENTOS_IGREJA",
    points: 15,
    isActive: true,
  },
  {
    slug: "dia-das-maes",
    title: "Dia das Mães",
    description: "Participação na homenagem especial do departamento.",
    period: "YEAR",
    area: "EVENTOS_IGREJA",
    points: 10,
    isActive: true,
  },
  {
    slug: "livro-missionario",
    title: "Livro Missionário",
    description: "Saída organizada para entrega de livros na vizinhança.",
    period: "YEAR",
    area: "EVENTOS_IGREJA",
    points: 15,
    isActive: true,
  },
  {
    slug: "quebrando-o-silencio",
    title: "Quebrando o Silêncio",
    description: "Participação na passeata ou distribuição de panfletos educativos.",
    period: "YEAR",
    area: "EVENTOS_IGREJA",
    points: 15,
    isActive: true,
  },
  {
    slug: "distribuicao-folhetos",
    title: "Distribuição de Folhetos",
    description: "Ação de impacto em locais públicos.",
    period: "YEAR",
    area: "EVENTOS_IGREJA",
    points: 15,
    isActive: true,
  },
  {
    slug: "mutirao-natal",
    title: "Mutirão de Natal",
    description: "Mobilização final para arrecadação de cestas básicas.",
    period: "YEAR",
    area: "EVENTOS_IGREJA",
    points: 20,
    isActive: true,
  },
  {
    slug: "concurso-eu-creio",
    title: "Concurso “Eu Creio”",
    description: "Estudo e preparação para avaliação sobre as crenças fundamentais.",
    period: "YEAR",
    area: "EVENTOS_IGREJA",
    points: 20,
    isActive: true,
  },
  {
    slug: "customizacao-sala-soul",
    title: "Customização da Sala SOUL+",
    description: "Reformar/decorar a sala: tema, recursos (lanches/doações) e execução.",
    period: "YEAR",
    area: "IDENTIDADE",
    points: 50,
    isActive: true,
  },
];

async function seedDatabase(prisma) {
  const adminPasswordHash = await hashPassword("Admin@12345");
  const leaderPasswordHash = await hashPassword("Lider@12345");
  const participantPasswordHash = await hashPassword("User@12345");

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@soulmais.local" },
    create: { email: "admin@soulmais.local", passwordHash: adminPasswordHash, role: "ADMIN" },
    update: { passwordHash: adminPasswordHash, role: "ADMIN" },
    select: { id: true, email: true, role: true },
  });

  const leaderUser = await prisma.user.upsert({
    where: { email: "lider@soulmais.local" },
    create: { email: "lider@soulmais.local", passwordHash: leaderPasswordHash, role: "LIDER" },
    update: { passwordHash: leaderPasswordHash, role: "LIDER" },
    select: { id: true, email: true, role: true },
  });

  const participantUser = await prisma.user.upsert({
    where: { email: "participante@soulmais.local" },
    create: { email: "participante@soulmais.local", passwordHash: participantPasswordHash, role: "PARTICIPANTE" },
    update: { passwordHash: participantPasswordHash, role: "PARTICIPANTE" },
    select: { id: true, email: true, role: true },
  });

  const leaderParticipant = await prisma.participant.upsert({
    where: { userId: leaderUser.id },
    create: {
      userId: leaderUser.id,
      name: "Líder (Seed)",
      guardianName: "Igreja",
      phone: "(00) 00000-0000",
      church: "Igreja (Seed)",
      isLeader: true,
    },
    update: {
      name: "Líder (Seed)",
      guardianName: "Igreja",
      phone: "(00) 00000-0000",
      church: "Igreja (Seed)",
      isLeader: true,
    },
    select: { id: true, name: true },
  });

  const participant = await prisma.participant.upsert({
    where: { userId: participantUser.id },
    create: {
      userId: participantUser.id,
      name: "Participante (Seed)",
      guardianName: "Responsável (Seed)",
      phone: "(00) 00000-0000",
      church: "Igreja (Seed)",
      isLeader: false,
    },
    update: {
      name: "Participante (Seed)",
      guardianName: "Responsável (Seed)",
      phone: "(00) 00000-0000",
      church: "Igreja (Seed)",
      isLeader: false,
    },
    select: { id: true, name: true },
  });

  const groupName = "SOUL+";
  const groupYear = new Date().getFullYear();

  let group = await prisma.group.findFirst({ where: { name: groupName, year: groupYear } });
  if (group === null) {
    group = await prisma.group.create({ data: { name: groupName, year: groupYear, isActive: true } });
  } else {
    group = await prisma.group.update({ where: { id: group.id }, data: { isActive: true } });
  }

  await prisma.groupMember.upsert({
    where: {
      groupId_participantId: {
        groupId: group.id,
        participantId: leaderParticipant.id,
      },
    },
    create: { groupId: group.id, participantId: leaderParticipant.id },
    update: {},
  });

  await prisma.groupMember.upsert({
    where: {
      groupId_participantId: {
        groupId: group.id,
        participantId: participant.id,
      },
    },
    create: { groupId: group.id, participantId: participant.id },
    update: {},
  });

  for (const activity of soulPlusActivities) {
    const normalizedPeriod = normalizePeriod(activity.period);
    await prisma.activity.upsert({
      where: { slug: activity.slug },
      create: { ...activity, period: normalizedPeriod },
      update: {
        title: activity.title,
        description: activity.description,
        period: normalizedPeriod,
        area: activity.area,
        points: activity.points,
        isActive: activity.isActive,
      },
    });
  }

  const activities = await prisma.activity.findMany({
    where: { isActive: true },
    select: { id: true, slug: true, period: true },
  });

  const bySlug = new Map(activities.map((a) => [a.slug, a]));
  const now = new Date();

  const completedSlugs = [
    "quiz-escola-sabatina",
    "presenca-ativa",
    "jogo-legado-28",
    "pg-ativo",
  ];

  for (const slug of completedSlugs) {
    const a = bySlug.get(slug);
    if (!a) continue;
    const periodKey = getPeriodKey(now, a.period);

    await prisma.completion.upsert({
      where: {
        participantId_activityId_periodKey: {
          participantId: participant.id,
          activityId: a.id,
          periodKey,
        },
      },
      create: {
        participantId: participant.id,
        activityId: a.id,
        periodKey,
        status: "CONCLUIDA",
        completedAt: now,
      },
      update: {
        status: "CONCLUIDA",
        completedAt: now,
      },
    });
  }

  return { adminUser, leaderUser, participantUser };
}

module.exports = { seedDatabase };

if (require.main === module) {
  require("dotenv/config");
  const { PrismaMariaDb } = require("@prisma/adapter-mariadb");
  const { PrismaClient } = require("@prisma/client");

  const adapter = new PrismaMariaDb({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 10,
    connectTimeout: 10000,
    acquireTimeout: 30000,
    allowPublicKeyRetrieval: true,
  });

  const prisma = new PrismaClient({ adapter });

  seedDatabase(prisma)
    .then(async () => {
      await prisma.$disconnect();
      process.stdout.write(
        `Seed OK: users=3 participants=2 groups=1 groupMembers=2 activities=${soulPlusActivities.length} completions=${4}\n`,
      );
    })
    .catch(async (e) => {
      await prisma.$disconnect();
      process.stderr.write(String(e) + "\n");
      process.exit(1);
    });
}
