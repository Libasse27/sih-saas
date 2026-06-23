import { ClinicalModule } from '@sih-saas/shared';
import { PlanEntity } from '../../modules/plans/infrastructure/entities/plan.entity';
import { AppDataSource } from '../data-source';

// Seed initial — données de départ modifiables ensuite sans redéploiement (prompt maître §8).
const PLANS: Array<Partial<PlanEntity>> = [
  {
    code: 'STANDARD',
    nom: 'Standard',
    description: 'Pour les petites structures qui démarrent leur transition numérique.',
    tarifs: { mensuel: 50000, annuel: 540000, devise: 'XOF' },
    limites: { maxUtilisateurs: 5, maxLits: 20, maxStockageMo: 1024 },
    modules: [ClinicalModule.DME, ClinicalModule.RDV, ClinicalModule.ADMISSIONS],
    features: { supportPrioritaire: false, apiAccess: false, multiSites: false },
    essaiGratuitJours: 14,
    visible: true,
    actif: true,
    ordreAffichage: 1,
  },
  {
    code: 'PROFESSIONNEL',
    nom: 'Professionnel',
    description: 'Pour les cliniques et hôpitaux avec pharmacie, laboratoire et imagerie.',
    tarifs: { mensuel: 150000, annuel: 1620000, devise: 'XOF' },
    limites: { maxUtilisateurs: 20, maxLits: 100, maxStockageMo: 10240 },
    modules: [
      ClinicalModule.DME,
      ClinicalModule.RDV,
      ClinicalModule.ADMISSIONS,
      ClinicalModule.URGENCES,
      ClinicalModule.PHARMACIE,
      ClinicalModule.LABORATOIRE,
      ClinicalModule.IMAGERIE,
      ClinicalModule.FACTURATION,
    ],
    features: { supportPrioritaire: true, apiAccess: false, multiSites: false },
    essaiGratuitJours: 14,
    visible: true,
    actif: true,
    ordreAffichage: 2,
  },
  {
    code: 'COMPLET',
    nom: 'Complet',
    description: 'Pour les groupes hospitaliers multi-sites avec télémédecine et accès API.',
    tarifs: { mensuel: 300000, annuel: 3240000, devise: 'XOF' },
    limites: { maxUtilisateurs: -1, maxLits: -1, maxStockageMo: -1 },
    modules: Object.values(ClinicalModule),
    features: { supportPrioritaire: true, apiAccess: true, multiSites: true },
    essaiGratuitJours: 30,
    visible: true,
    actif: true,
    ordreAffichage: 3,
  },
];

async function seedPlans() {
  const dataSource = await AppDataSource.initialize();
  const repository = dataSource.getRepository(PlanEntity);

  for (const plan of PLANS) {
    const exists = await repository.findOne({ where: { code: plan.code } });
    if (!exists) {
      await repository.save(repository.create(plan));
      console.log(`Plan créé : ${plan.code}`);
    } else {
      console.log(`Plan déjà présent, ignoré : ${plan.code}`);
    }
  }

  console.log('Seed plans terminé.');
  await dataSource.destroy();
}

seedPlans().catch((error) => {
  console.error('Échec du seed plans :', error);
  process.exit(1);
});
