export const FALLBACK_CASES = [
  {
    answer: "Parkinson's disease",
    accepted_synonyms: "parkinsons;parkinson disease;pd",
    symptoms: [
      "A 67-year-old presents with a resting tremor in the right hand.",
      "Family notes the patient's handwriting has become smaller over the past year.",
      "On exam, there is cogwheel rigidity in the right wrist.",
      "The patient walks with a stooped posture and shortened, shuffling steps.",
      "There is a marked reduction in facial expression (hypomimia)."
    ],
    explanation: "Parkinson's disease is a progressive neurodegenerative disorder caused by loss of dopaminergic neurons in the substantia nigra, classically producing resting tremor, rigidity, bradykinesia, and postural instability."
  },
  {
    answer: "Multiple sclerosis",
    accepted_synonyms: "ms",
    symptoms: [
      "A 29-year-old woman reports blurry vision and eye pain in her left eye that developed over two days.",
      "She also describes an electric shock sensation down her spine when she bends her neck forward.",
      "MRI history reveals a prior episode of leg weakness three years ago that fully resolved.",
      "On exam there is a relative afferent pupillary defect in the left eye.",
      "She lives in the northern United States and has low vitamin D."
    ],
    explanation: "Multiple sclerosis is an autoimmune, demyelinating disease of the CNS. This vignette describes optic neuritis plus Lhermitte's sign, with a past relapsing course — consistent with MS."
  },
  {
    answer: "Myasthenia gravis",
    accepted_synonyms: "mg",
    symptoms: [
      "A 45-year-old woman notices her eyelids droop more by the end of the day.",
      "She has double vision that worsens with prolonged reading.",
      "Chewing tough food becomes difficult toward the end of a meal.",
      "Symptoms improve noticeably after a short rest.",
      "An ice pack test on the eyelid improves the ptosis."
    ],
    explanation: "Myasthenia gravis is caused by autoantibodies against acetylcholine receptors at the neuromuscular junction, producing fatigable weakness — classically ptosis and diplopia that worsen with sustained use and improve with rest."
  }
];

export const NEURO_DISORDERS = [
  "Parkinson's disease", "Multiple sclerosis", "Myasthenia gravis", "Amyotrophic lateral sclerosis",
  "Alzheimer's disease", "Epilepsy", "Guillain-Barré syndrome", "Huntington's disease", "Migraine",
  "Bell's palsy", "Ischemic stroke", "Subarachnoid hemorrhage", "Bacterial meningitis", "Essential tremor",
  "Trigeminal neuralgia", "Narcolepsy", "Restless legs syndrome", "Carpal tunnel syndrome", "Cluster headache",
  "Normal pressure hydrocephalus", "Frontotemporal dementia", "Lewy body dementia", "Vascular dementia",
  "Tourette syndrome", "Cerebral palsy", "Down syndrome", "Autism spectrum disorder", "Spina bifida",
  "Tuberous sclerosis complex", "Neurofibromatosis type 1", "Charcot-Marie-Tooth disease",
  "Duchenne muscular dystrophy", "Cervical spondylotic myelopathy", "Transverse myelitis",
  "Spinal muscular atrophy", "Wilson's disease", "Creutzfeldt-Jakob disease", "Progressive supranuclear palsy",
  "Multiple system atrophy", "Friedreich's ataxia", "Cavernous sinus thrombosis", "Postherpetic neuralgia",
  "Acoustic neuroma", "Glioblastoma", "Chiari malformation", "Idiopathic intracranial hypertension",
  "Temporal arteritis", "Cervical dystonia", "Cerebral aneurysm", "Diabetic peripheral neuropathy",
  "Vestibular neuritis", "Brown-Séquard syndrome", "Pituitary adenoma", "Stiff person syndrome",
  "Wernicke encephalopathy", "Functional neurological disorder"
];

export const FALLBACK_QUESTIONS = [
  {
    image_url: "/neuron-hero.webp",
    choice_a: "Hippocampus", choice_b: "Amygdala", choice_c: "Cerebellum", choice_d: "Thalamus",
    correct_choice: "C",
    function_text: "The cerebellum coordinates voluntary movement, balance, and motor learning, fine-tuning timing and precision of muscle activity.",
    category: "Random", difficulty: "Easy"
  },
  {
    image_url: "/neuron-hero.webp",
    choice_a: "Broca's area", choice_b: "Occipital lobe", choice_c: "Hypothalamus", choice_d: "Basal ganglia",
    correct_choice: "B",
    function_text: "The occipital lobe is the brain's primary visual processing center, interpreting signals from the eyes into images.",
    category: "Gyri", difficulty: "Medium"
  },
  {
    image_url: "/neuron-hero.webp",
    choice_a: "Amygdala", choice_b: "Corpus callosum", choice_c: "Medulla oblongata", choice_d: "Frontal lobe",
    correct_choice: "A",
    function_text: "The amygdala processes emotional salience, especially fear and threat detection, and helps form emotional memories.",
    category: "Cortex", difficulty: "Hard"
  },
  {
    image_url: "/neuron-hero.webp",
    choice_a: "Prefrontal cortex", choice_b: "Parietal lobe", choice_c: "Temporal lobe", choice_d: "Insula",
    correct_choice: "A",
    function_text: "The prefrontal cortex governs executive functions including planning, decision-making, and impulse control.",
    category: "Neuropsychology", difficulty: "Easy"
  },
  {
    image_url: "/neuron-hero.webp",
    choice_a: "Cingulate gyrus", choice_b: "Brainstem", choice_c: "Pituitary gland", choice_d: "Hippocampus",
    correct_choice: "B",
    function_text: "The brainstem controls essential automatic functions including breathing, heart rate, and blood pressure.",
    category: "Random", difficulty: "Easy"
  }
];

export const BUILT_IN_REGIONS = [
  { region: 'Frontal Lobe', function_text: 'Controls decision-making, planning, personality, and voluntary movement. Home to Broca\'s area for speech production.' },
  { region: 'Temporal Lobe', function_text: 'Processes sound and language. Contains the hippocampus (memory) and amygdala (emotion).' },
  { region: 'Parietal Lobe', function_text: 'Integrates sensory information — touch, temperature, pain, and spatial awareness.' },
  { region: 'Occipital Lobe', function_text: 'Primary visual processing center. Interprets what your eyes see into recognizable images.' },
  { region: 'Cerebellum', function_text: 'Coordinates voluntary movement, balance, and motor learning. Essential for smooth, precise actions.' },
  { region: 'Hippocampus', function_text: 'Critical for forming new memories and spatial navigation. One of the first areas affected in Alzheimer\'s.' },
  { region: 'Amygdala', function_text: 'Processes emotional responses — especially fear and threat detection. Key to emotional memory formation.' },
  { region: 'Corpus Callosum', function_text: 'A thick band of nerve fibers connecting the left and right hemispheres, enabling communication between them.' },
  { region: 'Thalamus', function_text: 'A relay station for almost all sensory signals, routing them to the correct cortical areas.' },
  { region: 'Hypothalamus', function_text: 'Regulates hunger, thirst, sleep, body temperature, and the release of hormones via the pituitary gland.' },
  { region: 'Brainstem', function_text: 'Controls essential automatic functions including breathing, heart rate, blood pressure, and swallowing.' },
  { region: 'Insular Cortex', function_text: 'Hidden within the lateral sulcus; processes interoception, taste, and emotional experience.' },
];

export const GAMES_DATA = [
  {
    id: "daily-case",
    title: "The Daily Case",
    icon: "stethoscope",
    url: "daily-game.html",
    type: "daily"
  },
  {
    id: "neuroanatomy",
    title: "Map the Brain",
    icon: "brain",
    url: "neuroanatomy.html",
    type: "normal"
  }
];
