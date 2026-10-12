const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");
const toast = document.getElementById("toast");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!prefersReducedMotion) {
  document.documentElement.classList.add("motion-ready");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2600);
}

if (menuToggle && mainNav) {
  const setMenuOpen = (isOpen) => {
    mainNav.classList.toggle("open", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  };

  menuToggle.addEventListener("click", () => {
    setMenuOpen(!mainNav.classList.contains("open"));
  });

  mainNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setMenuOpen(false));
  });

  document.addEventListener("click", (event) => {
    if (!mainNav.contains(event.target) && !menuToggle.contains(event.target)) {
      setMenuOpen(false);
    }
  });
}

const mobileNav = document.querySelector(".mobile-bottom-nav");

if (mobileNav) {
  const mobileNavLinks = Array.from(mobileNav.querySelectorAll("a[href^='#']"));
  const setActiveMobileLink = (link) => {
    mobileNavLinks.forEach((item) => item.removeAttribute("aria-current"));
    link?.setAttribute("aria-current", "location");
  };

  mobileNavLinks.forEach((link) => {
    link.addEventListener("click", () => setActiveMobileLink(link));
  });

  const mobileNavSections = mobileNavLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if ("IntersectionObserver" in window) {
    const navObserver = new IntersectionObserver(
      (entries) => {
        const visibleSection = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visibleSection) return;

        const activeLink = mobileNavLinks.find(
          (link) => link.getAttribute("href") === `#${visibleSection.target.id}`
        );
        setActiveMobileLink(activeLink);
      },
      { rootMargin: "-25% 0px -55% 0px", threshold: [0, 0.15, 0.35, 0.6] }
    );

    mobileNavSections.forEach((section) => navObserver.observe(section));
  }

  const initialMobileLink = mobileNavLinks.find(
    (link) => link.getAttribute("href") === window.location.hash
  );
  setActiveMobileLink(initialMobileLink || mobileNavLinks[0]);
}

const modalReturnFocus = new WeakMap();

function openModal(modal, trigger) {
  if (!modal) return;

  modalReturnFocus.set(modal, trigger || document.activeElement);
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  modal.querySelector("[data-modal-autofocus], input, select, textarea, button:not([data-close-modal])")?.focus();
}

function closeModal(modal) {
  if (!modal) return;

  const returnFocus = modalReturnFocus.get(modal);
  if (returnFocus?.isConnected) returnFocus.focus();
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

document.querySelectorAll("[data-open-modal]").forEach((button) => {
  button.addEventListener("click", () => {
    mainNav?.classList.remove("open");
    menuToggle?.setAttribute("aria-expanded", "false");
    menuToggle?.setAttribute("aria-label", "Open navigation");
    openModal(document.getElementById(button.dataset.openModal), button);
  });
});

document.querySelectorAll("[data-close-modal]").forEach((element) => {
  element.addEventListener("click", () => {
    const modal = element.closest(".modal");
    closeModal(modal);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (mainNav?.classList.contains("open") && menuToggle) {
      mainNav.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open navigation");
    }
    closeModal(document.querySelector(".modal.open"));
    return;
  }

  if (event.key === "Tab") {
    const modal = document.querySelector(".modal.open");
    if (!modal) return;

    const focusable = Array.from(
      modal.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')
    ).filter((element) => element.getClientRects().length);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  }
});

const cycleForm = document.getElementById("cycleForm");
const cycleStorageKey = "abenest-cycle-tracker";
let selectedCycleMood = "";
const selectedSymptoms = new Set();
let selectedHydration = "";

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function cycleDayNumber(dateValue, today) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const start = Date.UTC(year, month - 1, day);
  const current = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.floor((current - start) / 86400000);
}

function renderCycleTimeline(cycleLength, cycleDay, periodLength, fertileStart, fertileEnd, ovulationDay) {
  const timeline = document.getElementById("cycleTimeline");
  const days = Array.from({ length: cycleLength }, (_, index) => {
    const day = index + 1;
    const classes = ["cycle-day"];
    if (day <= periodLength) classes.push("is-period");
    if (day >= fertileStart && day <= fertileEnd) classes.push("is-fertile");
    if (day === ovulationDay) classes.push("is-ovulation");
    if (day === cycleDay) classes.push("is-current");
    const current = day === cycleDay ? ' aria-current="date"' : "";
    return `<span class="${classes.join(" ")}" aria-label="Cycle day ${day}${day === cycleDay ? ", today" : ""}"${current}><small>DAY</small><strong>${day}</strong></span>`;
  });

  timeline.innerHTML = days.join("");
  document.getElementById("timelineCaption").textContent = `${cycleLength}-day average · estimates may vary`;
}

if (cycleForm) {
  const today = new Date();
  const todayString = localDateString(today);
  const lastPeriodInput = document.getElementById("lastPeriod");
  const cycleLengthInput = document.getElementById("cycleLength");
  const periodLengthInput = document.getElementById("periodLength");
  const flowIntensityInput = document.getElementById("flowIntensity");

  document.getElementById("checkinDate").textContent = new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(today);

  document.querySelectorAll("#cycleMoodOptions [data-cycle-mood]").forEach((button) => {
    button.setAttribute("aria-pressed", "false");
  });

  function updateCheckinFeedback(wasCleared = false) {
    const feedback = document.getElementById("symptomFeedback");
    const details = [selectedCycleMood, selectedHydration, ...selectedSymptoms].filter(Boolean);
    if (!details.length) {
      feedback.textContent = wasCleared
        ? "Your reflection is clear. You can leave it blank or start again whenever you like."
        : "Pick what feels right. Every feeling and body is welcome here—or skip this reflection.";
      return;
    }

    const moodMessages = {
      Good: "Lovely. Let that good feeling have a little room.",
      Okay: "Okay is a whole feeling. Take today one step at a time.",
      "Low energy": "Rest is allowed; you do not have to earn it.",
      Energized: "Enjoy that spark, and let it move at your own pace.",
    };
    const hydrationMessages = {
      "Had some water": "A little water is a kind way to care for yourself.",
      "Could drink more": "A small sip when you can is a gentle place to start.",
      "Not sure yet": "No pressure—just notice what your body might need.",
    };
    const encouragement = [
      moodMessages[selectedCycleMood],
      hydrationMessages[selectedHydration],
      selectedSymptoms.size
        ? "Your body is sharing information, not asking you to judge it. A gentle check-in is enough."
        : "",
    ].filter(Boolean).join(" ");
    feedback.textContent = `${encouragement} Your reflection: ${details.join(", ")}. It stays here only while this page is open.`;
  }

  cycleForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const lastPeriodValue = lastPeriodInput.value;
    const cycleLength = Number(cycleLengthInput.value);
    const periodLength = Number(periodLengthInput.value);
    const flowIntensity = flowIntensityInput.value;

    if (!lastPeriodValue) {
      showToast("Please select the first day of your last period.");
      return;
    }

    const daysSince = cycleDayNumber(lastPeriodValue, today);
    if (daysSince < 0) {
      showToast("The first day of your last period cannot be in the future.");
      return;
    }

    const cycleDay = (daysSince % cycleLength) + 1;
    const [year, month, day] = lastPeriodValue.split("-").map(Number);
    const nextPeriod = new Date(year, month - 1, day + (Math.floor(daysSince / cycleLength) + 1) * cycleLength, 12);
    const ovulationDay = Math.max(1, cycleLength - 13);
    const fertileStartDay = Math.max(periodLength + 1, ovulationDay - 5);
    const fertileEndDay = Math.min(cycleLength, ovulationDay + 1);

    const nextCycleStart = new Date(nextPeriod);
    nextCycleStart.setDate(nextCycleStart.getDate() - cycleLength);
    const fertileStart = new Date(nextCycleStart);
    fertileStart.setDate(fertileStart.getDate() + fertileStartDay - 1);

    const fertileEnd = new Date(nextCycleStart);
    fertileEnd.setDate(fertileEnd.getDate() + fertileEndDay - 1);

    const formatter = new Intl.DateTimeFormat("en", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const phase = cycleDay <= periodLength
      ? "Period phase"
      : cycleDay >= fertileStartDay && cycleDay <= fertileEndDay
        ? "Fertile window estimate"
        : cycleDay < fertileStartDay
          ? "Follicular phase"
          : "Luteal phase";
    const phaseDescriptions = {
      "Period phase": "Your period may be underway. Rest and care can look different for everyone.",
      "Fertile window estimate": "This is a calendar estimate, not a prediction of whether ovulation has happened.",
      "Follicular phase": "This part of the cycle follows your period and leads toward an estimated fertile window.",
      "Luteal phase": "This part of the cycle follows the estimated fertile window and leads toward your next period.",
    };
    document.getElementById("cycleDayResult").textContent = cycleDay;
    document.getElementById("cycleLengthLabel").textContent = `of ${cycleLength} days`;
    document.getElementById("cycleRing").style.setProperty("--cycle-progress", `${(cycleDay / cycleLength) * 360}deg`);
    document.getElementById("cyclePhaseBadge").textContent = phase;
    document.getElementById("cyclePhaseTitle").textContent = phase;
    document.getElementById("cyclePhaseDescription").textContent = phaseDescriptions[phase];
    document.getElementById("periodDurationResult").textContent = `${periodLength} days`;
    document.getElementById("flowNoteResult").textContent = flowIntensity;
    document.getElementById("nextPeriodResult").textContent = formatter.format(nextPeriod);
    const daysUntil = Math.ceil(cycleLength - daysSince % cycleLength);
    document.getElementById("daysUntilResult").textContent = daysUntil === 1 ? "About 1 day away" : `About ${daysUntil} days away`;
    document.getElementById("fertileResult").textContent =
      `${formatter.format(fertileStart)} – ${formatter.format(fertileEnd)}`;
    renderCycleTimeline(cycleLength, cycleDay, periodLength, fertileStartDay, fertileEndDay, ovulationDay);
    showToast("Cycle estimate updated. It was not saved.");
  });

  document.getElementById("logPeriodToday").addEventListener("click", () => {
    lastPeriodInput.value = todayString;
    cycleForm.requestSubmit();
    showToast("Today's estimate is shown only on this page.");
  });

  document.querySelectorAll("#cycleMoodOptions [data-cycle-mood]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedCycleMood = selectedCycleMood === button.dataset.cycleMood ? "" : button.dataset.cycleMood;
      document.querySelectorAll("#cycleMoodOptions [data-cycle-mood]").forEach((item) => {
        const isSelected = item.dataset.cycleMood === selectedCycleMood;
        item.classList.toggle("active", isSelected);
        item.setAttribute("aria-pressed", String(isSelected));
      });
      updateCheckinFeedback();
    });
  });

  document.querySelectorAll("#symptomGrid [data-symptom]").forEach((button) => {
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      const symptom = button.dataset.symptom;
      if (selectedSymptoms.has(symptom)) selectedSymptoms.delete(symptom);
      else selectedSymptoms.add(symptom);

      const isSelected = selectedSymptoms.has(symptom);
      button.classList.toggle("active", isSelected);
      button.setAttribute("aria-pressed", String(isSelected));
      updateCheckinFeedback();
    });
  });

  document.querySelectorAll("#hydrationCheckin [data-hydration]").forEach((button) => {
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      selectedHydration = selectedHydration === button.dataset.hydration ? "" : button.dataset.hydration;
      document.querySelectorAll("#hydrationCheckin [data-hydration]").forEach((item) => {
        const isSelected = item.dataset.hydration === selectedHydration;
        item.classList.toggle("active", isSelected);
        item.setAttribute("aria-pressed", String(isSelected));
      });
      updateCheckinFeedback();
    });
  });

  document.getElementById("clearCycleReflection").addEventListener("click", () => {
    selectedCycleMood = "";
    selectedHydration = "";
    selectedSymptoms.clear();
    document.querySelectorAll("#cycleMoodOptions [data-cycle-mood], #hydrationCheckin [data-hydration], #symptomGrid [data-symptom]").forEach((button) => {
      button.classList.remove("active");
      button.setAttribute("aria-pressed", "false");
    });
    updateCheckinFeedback(true);
  });

  const clearLegacyCycleDataButton = document.getElementById("clearLegacyCycleData");
  try {
    clearLegacyCycleDataButton.hidden = !localStorage.getItem(cycleStorageKey);
  } catch {
    clearLegacyCycleDataButton.hidden = true;
    document.getElementById("legacyCycleDataStatus").textContent =
      "This browser does not allow ABE Nest to check for older saved cycle details.";
  }
  clearLegacyCycleDataButton.addEventListener("click", () => {
    try {
      localStorage.removeItem(cycleStorageKey);
      clearLegacyCycleDataButton.hidden = true;
      document.getElementById("legacyCycleDataStatus").textContent = "Older ABE Nest cycle details were removed from this browser.";
    } catch {
      showToast("This browser could not remove the older saved details.");
    }
  });

  updateCheckinFeedback();
}

const resourceFilters = Array.from(document.querySelectorAll("#articleFilters .filter"));
const resourceCards = Array.from(document.querySelectorAll("#resourceGrid .article-card"));
const resourceSearch = document.getElementById("resourceSearch");
const resourceSearchStatus = document.getElementById("resourceSearchStatus");
const resourceResetButton = document.getElementById("resourceReset");
let activeResourceCategory = "all";

function filterResources() {
  if (!resourceSearch || !resourceSearchStatus) return;

  const query = resourceSearch.value.trim().toLocaleLowerCase();
  let visibleCount = 0;

  resourceCards.forEach((card) => {
    const matchesCategory = activeResourceCategory === "all" || card.dataset.category === activeResourceCategory;
    const matchesQuery = !query || card.textContent.toLocaleLowerCase().includes(query);
    const isVisible = matchesCategory && matchesQuery;
    card.hidden = !isVisible;
    card.classList.toggle("is-visible", isVisible);
    if (isVisible) visibleCount += 1;
  });

  if (!visibleCount) {
    resourceSearchStatus.textContent = query
      ? "No topics match that search. Try another word or choose a different category."
      : "No topics are available in this category right now. Try another topic filter.";
    return;
  }

  resourceSearchStatus.textContent = `Showing ${visibleCount} ${visibleCount === 1 ? "topic" : "topics"}${query ? ` matching “${resourceSearch.value.trim()}”` : ""}.`;
}

function resetResourceSearch() {
  if (!resourceSearch) return;
  resourceSearch.value = "";
  activeResourceCategory = "all";
  resourceFilters.forEach((item) => {
    const isActive = item.dataset.category === "all";
    item.classList.toggle("active", isActive);
    item.setAttribute("aria-pressed", String(isActive));
  });
  filterResources();
}

resourceFilters.forEach((filterButton) => {
  filterButton.addEventListener("click", () => {
    activeResourceCategory = filterButton.dataset.category;
    resourceFilters.forEach((item) => {
      const isActive = item === filterButton;
      item.classList.toggle("active", isActive);
      item.setAttribute("aria-pressed", String(isActive));
    });
    filterResources();
  });
});

resourceSearch?.addEventListener("input", filterResources);
resourceResetButton?.addEventListener("click", resetResourceSearch);

document.querySelectorAll("[data-food-filter]").forEach((filterButton) => {
  filterButton.addEventListener("click", () => {
    const category = filterButton.dataset.foodFilter;
    let visibleCount = 0;
    document.querySelectorAll(".food-group-card").forEach((card) => {
      const isVisible = category === "all" || card.dataset.foodGroup === category;
      card.hidden = !isVisible;
      if (isVisible) visibleCount += 1;
    });
    document.querySelectorAll("[data-food-filter]").forEach((item) => {
      const isActive = item === filterButton;
      item.classList.toggle("active", isActive);
      item.setAttribute("aria-pressed", String(isActive));
    });
    document.getElementById("foodFilterStatus").textContent =
      `Showing ${visibleCount} ${visibleCount === 1 ? "food group" : "food groups"}.`;
  });
});

document.querySelectorAll("[data-quiz-answer]").forEach((button) => {
  button.addEventListener("click", () => {
    const isCorrect = button.dataset.quizAnswer === "professional";
    document.querySelectorAll("[data-quiz-answer]").forEach((item) => {
      item.classList.toggle("is-correct", item.dataset.quizAnswer === "professional" && isCorrect);
      item.classList.toggle("is-incorrect", item === button && !isCorrect);
      item.setAttribute("aria-pressed", String(item === button));
    });
    document.getElementById("knowledgeCheckFeedback").textContent = isCorrect
      ? "That’s right. A qualified health professional can give advice for your personal situation."
      : "Not quite. Online posts and calendar tools cannot assess your individual health; a qualified health professional can.";
  });
});

const articleContent = {
  cycleArticle: {
    category: "My period",
    title: "What is a normal menstrual cycle?",
    body: `
      <p>Menstrual cycles can vary from person to person. A cycle is counted from the first day of one period to the first day of the next.</p>
      <p>Changes can happen because of stress, illness, travel, sleep, weight changes, medication, or normal hormonal variation.</p>
      <p>Consider speaking with a qualified healthcare professional when bleeding is extremely heavy, pain is severe, periods suddenly change for several months, or you are worried about pregnancy.</p>
      <p><strong>Important:</strong> cycle predictions are estimates and should not be used as guaranteed contraception.</p>
    `,
  },
  dischargeArticle: {
    category: "My body",
    title: "Understanding vaginal discharge",
    body: `
      <p>Clear or white discharge can be a normal part of the menstrual cycle. Its amount and texture can change during the month.</p>
      <p>Seek professional advice when discharge has a strong unpleasant smell, is accompanied by severe itching or pain, or has an unusual colour that worries you.</p>
      <p>Avoid putting harsh products inside the vagina. The vagina naturally cleans itself.</p>
    `,
  },
  selfCareArticle: {
    category: "Well-being",
    title: "Being kinder to yourself on difficult days",
    body: `
      <p>Rest is not laziness. On difficult days, try reducing your expectations and choosing one small helpful action.</p>
      <p>You might drink water, take a short walk, write down what you feel, speak to someone you trust, or sleep earlier.</p>
      <p>If sadness, anxiety, or hopelessness becomes intense or persistent, reach out to a qualified mental health professional or trusted support person.</p>
    `,
  },
  skillsArticle: {
    category: "My future",
    title: "How to begin building your skills",
    body: `
      <p>Choose one useful skill that connects to your goals. Break it into small weekly topics, practise regularly, and create small projects.</p>
      <p>Do not wait until you feel fully ready. Progress becomes visible after repeated practice.</p>
      <p>Save examples of your work so you can later build a portfolio for internships, scholarships, clients, or jobs.</p>
    `,
  },
  nutritionArticle: {
    category: "Nutrition",
    title: "Build a satisfying everyday plate",
    body: `
      <p>Think of meals as flexible combinations rather than strict rules. A familiar staple can sit alongside a protein food and vegetables or fruit, with fat for flavour and fullness.</p>
      <p>For example, beans, leafy greens such as dodo or isombe leaves, and a staple such as sweet potato, cassava, rice, or ubugali can be one option. Availability, cost, appetite, and culture all matter.</p>
      <p>No single food or meal is right for everyone. If you have a medical condition, food allergy, or a personal nutrition concern, ask a qualified health professional for tailored advice.</p>
    `,
  },
  maternalArticle: {
    category: "Pregnancy & parenting",
    title: "Finding support during pregnancy and after birth",
    body: `
      <p>Pregnancy and the weeks and months after birth can bring physical, emotional, and practical changes. A trusted health professional can answer questions and help you plan care that fits your needs.</p>
      <p>If it feels safe, consider asking someone you trust for practical help with rest, transport, meals, or caring for a baby. Young parents deserve respectful support and care without judgment.</p>
      <p>Seek urgent local medical care for symptoms that feel severe or rapidly worsening. This general information cannot assess a pregnancy or replace professional care.</p>
    `,
  },
  habitsArticle: {
    category: "Everyday habits",
    title: "Gentle routines for sleep, water, and movement",
    body: `
      <p>Small routines can support everyday wellbeing, but there is no one routine that suits every body or schedule. Rest when you can, drink safe water when available, and choose movement that feels comfortable to you.</p>
      <p>A short walk, stretching, dancing, active play, or household movement may all count as movement. Adapt or stop if it causes pain, dizziness, or concern.</p>
      <p>Ongoing difficulty sleeping, low energy, or other symptoms that worry you are good reasons to speak with a qualified health professional.</p>
    `,
  },
  preventionArticle: {
    category: "Preventive care",
    title: "Making preventive care feel more approachable",
    body: `
      <p>A health visit can be a place to ask questions, discuss changes you have noticed, and ask which preventive checks or vaccines are suitable for you.</p>
      <p>Before a visit, you might write down your questions or bring someone you trust if you want support. You can ask what information will be kept private and who may see it.</p>
      <p>Which services are recommended can depend on age, health history, and local guidance. A qualified health professional can explain what is relevant to you.</p>
    `,
  },
  digitalArticle: {
    category: "Digital health literacy",
    title: "Finding useful health information online",
    body: `
      <p>Look for who created the information, when it was last reviewed, and whether it explains where its claims come from. Health needs are personal, so a general article may not answer every question.</p>
      <p>Be cautious when a page promises a cure, creates urgency to sell something, or asks for sensitive details without explaining why they are needed and how they are protected.</p>
      <p>For personal symptoms, diagnosis, or treatment, speak with a qualified health professional. You do not need to share identifying or private details just to browse this learning library.</p>
    `,
  },
};

document.querySelectorAll("[data-open-article]").forEach((button) => {
  button.addEventListener("click", () => {
    const article = articleContent[button.dataset.openArticle];
    document.getElementById("articleCategory").textContent = article.category;
    document.getElementById("articleTitle").textContent = article.title;
    document.getElementById("articleBody").innerHTML = article.body;

    const modal = document.getElementById("articleModal");
    openModal(modal, button);
  });
});

const askForm = document.getElementById("askForm");
if (askForm) {
  askForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const response = document.getElementById("askResponse");

    if (response) {
      response.classList.remove("hidden");
      response.innerHTML = `
        <strong>Thank you for asking.</strong>
        <p>This preview does not send or store your question. Explore the learning library, or use the Contact links if you want to reach the ABE Nest team directly.</p>
        <p>For now, avoid using a website response as a diagnosis. Seek qualified medical care for severe pain, heavy bleeding, breathing difficulty, fainting, possible pregnancy complications, violence, or any situation that feels urgent.</p>
      `;
    }

    event.target.reset();
  });
}

const topicData = {
  "Period Talk": {
    prompt: "What is one thing you wish someone had explained before your first period?",
    choices: ["I had enough information", "I learned after it started", "I am still learning"],
  },
  "Girls in Tech": {
    prompt: "Which technology skill would you like to learn this year?",
    choices: ["Design", "Coding", "Digital skills"],
  },
  "Confidence Corner": {
    prompt: "What is one quality you appreciate about yourself?",
    choices: ["Kindness", "Courage", "Creativity"],
  },
  "School and University": {
    prompt: "What study habit helps you most?",
    choices: ["Plan ahead", "Take short breaks", "Study with friends"],
  },
  Entrepreneurship: {
    prompt: "What would help you start a community project?",
    choices: ["Learning", "Funding", "Mentorship"],
  },
  "Mental Wellness": {
    prompt: "What helps you reset on a difficult day?",
    choices: ["Rest", "Movement", "Talk to someone"],
  },
};

document.querySelectorAll(".topic").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".topic").forEach((item) => {
      item.classList.remove("active");
      item.setAttribute("aria-pressed", "false");
    });
    button.classList.add("active");
    button.setAttribute("aria-pressed", "true");

    const topic = button.dataset.topic;
    const data = topicData[topic];
    document.getElementById("topicTitle").textContent = topic;
    document.getElementById("topicDescription").textContent = data.prompt;
    document.querySelectorAll(".poll button").forEach((pollButton, index) => {
      pollButton.textContent = data.choices[index];
      pollButton.dataset.poll = data.choices[index];
      pollButton.classList.remove("active");
      pollButton.setAttribute("aria-pressed", "false");
    });
    document.getElementById("pollMessage").textContent = "Preview only · votes are not saved.";
  });
});

document.querySelectorAll(".poll button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".poll button").forEach((item) => {
      item.classList.remove("active");
      item.setAttribute("aria-pressed", "false");
    });
    button.classList.add("active");
    button.setAttribute("aria-pressed", "true");
    document.getElementById("pollMessage").textContent =
      `Preview only: “${button.dataset.poll}” was not submitted, saved, or counted.`;
  });
});

document.querySelectorAll("[data-demo-message]").forEach((button) => {
  button.addEventListener("click", () => showToast(button.dataset.demoMessage));
});

const quickExit = document.getElementById("quickExit");
if (quickExit) {
  quickExit.addEventListener("click", () => {
    window.location.href = "https://www.google.com";
  });
}

document.querySelectorAll(".save-button").forEach((button) => {
  button.addEventListener("click", () => {
    const saved = button.classList.toggle("saved");
    button.setAttribute("aria-pressed", String(saved));
    button.textContent = saved ? "Saved for this visit" : "Save for this visit";
    showToast(saved ? "Saved only for this visit." : "Removed from this visit.");
  });
});

const ABENEST_WHATSAPP_NUMBER = "250787248328";

function openWhatsAppDraft(message, statusElement, statusMessage) {
  const whatsappUrl = `https://wa.me/${ABENEST_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  statusElement.textContent = statusMessage;

  const whatsappWindow = window.open("about:blank", "_blank");
  if (whatsappWindow) {
    whatsappWindow.opener = null;
    whatsappWindow.location.replace(whatsappUrl);
  } else {
    window.location.assign(whatsappUrl);
  }
}

const contactForm = document.getElementById("contactForm");

contactForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = document.getElementById("contactName").value.trim();
  const email = document.getElementById("contactEmail").value.trim();
  const reason = document.getElementById("contactReason").value;
  const message = document.getElementById("contactMessage").value.trim();
  const whatsappMessage = [
    "Hello ABENEST, I'd like to get in touch.",
    `Name: ${name}`,
    `Email: ${email}`,
    `Reason: ${reason}`,
    `Message: ${message}`,
  ].join("\n");

  openWhatsAppDraft(
    whatsappMessage,
    document.getElementById("contactStatus"),
    "WhatsApp is opening with your message draft. Review it and tap Send to contact ABENEST."
  );
});

const joinForm = document.getElementById("joinForm");
if (joinForm) {
  const joinStatus = document.getElementById("joinStatus");
  const joinSubmitButton = joinForm.querySelector('button[type="submit"]');
  const joinModal = document.getElementById("joinModal");

  joinForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(joinForm);
    const fullName = String(formData.get("fullName") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const areaOfInterest = String(formData.get("areaOfInterest") || "").trim();
    const reason = String(formData.get("reason") || "").trim();

    if (joinForm.dataset.submitting === "true") return;

    joinForm.dataset.submitting = "true";
    joinSubmitButton.disabled = true;
    const originalButtonText = joinSubmitButton.innerHTML;
    joinSubmitButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Opening WhatsApp...';

    const whatsappMessage = [
      "Hello ABENEST, I would like to join ABE Nest.",
      `Full name: ${fullName}`,
      `WhatsApp number: ${phone}`,
      ...(email ? [`Email: ${email}`] : []),
      `Interested in: ${areaOfInterest}`,
      ...(reason ? [`Note: ${reason}`] : []),
    ].join("\n");

    closeModal(joinModal);
    openWhatsAppDraft(
      whatsappMessage,
      joinStatus,
      "WhatsApp is opening with your membership details. Review it and tap Send to complete your request."
    );

    window.setTimeout(() => {
      joinForm.reset();
      joinForm.dataset.submitting = "false";
      joinSubmitButton.disabled = false;
      joinSubmitButton.innerHTML = originalButtonText;
    }, 1800);
  });
}

document.getElementById("currentYear").textContent = new Date().getFullYear();

const nutritionForm = document.getElementById("nutritionForm");

if (nutritionForm) {
  nutritionForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(nutritionForm);
    const age = Number(formData.get("age"));
    const height = Number(formData.get("height"));
    const weight = Number(formData.get("weight"));
    const activity = Number(formData.get("activity"));
    const equation = formData.get("equation");

    if (![age, height, weight, activity].every(Number.isFinite) || (equation !== "female" && equation !== "male")) {
      showToast("Please check the details and try again.");
      return;
    }

    const equationConstant = equation === "female" ? -161 : 5;
    const restingEnergy = 10 * weight + 6.25 * height - 5 * age + equationConstant;
    const estimatedMaintenance = Math.round((restingEnergy * activity) / 50) * 50;

    document.getElementById("maintenanceCalories").textContent =
      new Intl.NumberFormat().format(estimatedMaintenance);
    document.getElementById("maintenanceSummary").textContent =
      "A rough starting estimate for maintaining your current weight. Your actual needs can differ and change over time.";
    document.getElementById("nutritionResult").hidden = false;
  });
}

const revealItems = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window && !prefersReducedMotion) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14 }
  );

  revealItems.forEach((item) => {
    const bounds = item.getBoundingClientRect();
    if (bounds.top < window.innerHeight && bounds.bottom > 0) {
      item.classList.add("is-visible");
    } else {
      observer.observe(item);
    }
  });
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

const videoPlayers = document.querySelectorAll(".local-video-card video");
videoPlayers.forEach((video) => {
  video.addEventListener("play", () => {
    videoPlayers.forEach((otherVideo) => {
      if (otherVideo !== video) otherVideo.pause();
    });
  });

  video.addEventListener("error", () => {
    const status = video.closest(".local-video-card")?.querySelector(".video-play-hint");
    if (!status) return;

    status.textContent = video.closest("[lang='rw']")
      ? "Iyi video ntiyashoboye gufunguka hano. Kanda kuri “Kuramo video” kugira ngo uyifungure muri porogaramu ya video."
      : "This video could not be played here. Use “Download video” to open it in a media player.";
  });
});

const chatPanel = document.getElementById("chatPanel");
const chatToggle = document.getElementById("chatToggle");
const chatClose = document.getElementById("chatClose");
const guideBuddy = document.getElementById("guideBuddy");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");
const chatServiceConsent = document.getElementById("chatServiceConsent");
const chatServiceConsentWrap = document.getElementById("chatServiceConsentWrap");

const guideTopics = [
  {
    pattern: /kill myself|end my life|hurt myself|suicid|want to die|self.?harm/i,
    reply: "I’m really sorry things feel this hard. You deserve immediate, caring support. If you may hurt yourself now, please move near a trusted person and contact local emergency services or go to the nearest health facility. If you can, tell someone you trust plainly: ‘I might not be safe alone right now.’ You do not need to share more here.",
  },
  {
    pattern: /unsafe|in danger|being hurt|violence|abused|abuse|assault|forced|threaten|rape|gbv/i,
    reply: "I’m sorry this is happening. You deserve to be safe, and it is not your fault. If you are in immediate danger, move to a safer place if you can and contact local emergency services or a trusted person now. A qualified health professional or trusted support organization can help you consider next steps. You do not have to describe what happened here.",
  },
  {
    pattern: /faint|passing out|can't breathe|cannot breathe|trouble breathing|severe pain|unbearable pain|very heavy bleeding|bleeding heavily|soaking.*(pad|hour)/i,
    reply: "Those symptoms can need urgent medical attention. Please contact local emergency services or go to the nearest health facility now, especially if you feel faint, have severe pain, trouble breathing, or very heavy bleeding. I can share general information, but I can’t assess an emergency online.",
  },
  {
    pattern: /hello|hi\b|hey\b|good morning|good afternoon|good evening/i,
    reply: "Hi! I’m glad you reached out. I can share general information about periods, body changes, well-being, safety, and the ABENEST website. What would you like help with?",
  },
  {
    pattern: /cramp|period pain|menstrual pain|pms|pain during.*period/i,
    reply: "Period cramps are common, though they can feel different for everyone. Some people find a warm compress, rest, water, or gentle movement comforting. If the pain is severe, new, keeps you from daily activities, or worries you, speak with a qualified health professional. I can’t diagnose the cause.",
  },
  {
    pattern: /cycle tracker|track my cycle|calculate.*cycle|cycle day|next period|fertile|ovulat/i,
    reply: "In the Menstrual Health section, you can optionally enter the first day of your last period and your usual cycle and period lengths to see a calendar estimate. Cycle day 1 is the first day of bleeding. It is not saved, and the dates can be off; they should never be used as contraception or a diagnosis.",
  },
  {
    pattern: /period|menstrual|menstruat|first period|late period|missed period/i,
    reply: "A menstrual cycle is counted from the first day of one period to the first day of the next. Cycles can vary, especially during the teen years. If a period is suddenly very different, you have severe pain or unusually heavy bleeding, or you’re worried, a qualified health professional can help. Browse the Menstrual Health topics for more general information.",
  },
  {
    pattern: /discharge|vagina|vaginal|itch|intimate wash|vulva/i,
    reply: "Clear or white vaginal discharge can be a normal body change, and it can vary over the cycle. Avoid putting harsh products inside the vagina. If you notice a strong unpleasant smell, pain, significant itching, an unusual change, or anything that concerns you, please speak with a qualified health professional.",
  },
  {
    pattern: /pregnan|pregnancy|pregnant|pregnancy test|unprotected sex/i,
    reply: "If pregnancy is possible, a qualified health professional or clinic can advise you about testing and options in a private, respectful way. A late period can have many causes, so a tracker cannot confirm pregnancy. Severe pain, fainting, or heavy bleeding needs urgent medical care.",
  },
  {
    pattern: /sex|contracept|birth control|condom|consent|reproductive health/i,
    reply: "You deserve clear, respectful information and the freedom to make decisions without pressure. Consent must be freely given and can be withdrawn. For personal questions about contraception or sexual and reproductive health, speak with a qualified health professional or trusted youth-friendly service; availability and privacy rules can vary.",
  },
  {
    pattern: /sad|anxious|anxiety|stress|overwhel|lonely|confidence|self.?esteem|mental|mood|upset/i,
    reply: "I’m sorry you’re carrying that. If it feels okay, try one small step: take a few slow breaths, drink some water, or reach out to someone you trust. You don’t have to manage everything alone. If these feelings are intense, continue for a while, or you feel unsafe, please talk with a trusted person and a qualified mental health professional.",
  },
  {
    pattern: /support|contact|volunteer|partner|partnership|outreach|email|whatsapp/i,
    reply: "You can reach the ABE Nest team through the Contact section, by email at abenest250@gmail.com, or by WhatsApp at +250 787 248 328. For urgent medical or safety concerns, contact local emergency services or a nearby health facility rather than waiting for a website reply.",
  },
  {
    pattern: /sisterhood|community|poll|discussion|talk to other|girls in tech/i,
    reply: "The Community section has topic rooms and a conversation prompt. The poll is only a preview: it does not send or save votes to a community server.",
  },
  {
    pattern: /learn|article|read|information|education/i,
    reply: "Visit Explore Topics to search and filter articles on menstrual and reproductive health, nutrition, wellbeing, pregnancy, daily habits, preventive care, and digital health. The information is general and not a substitute for professional care.",
  },
  {
    pattern: /job|scholarship|opportunit|career|skill|education|future|school/i,
    reply: "ABE Nest supports learning and wellbeing. Explore health topics and community conversations for confidence, education, and skills. Check details with the relevant school or opportunity provider before sharing personal information.",
  },
  {
    pattern: /thank|thanks/i,
    reply: "You’re welcome. I’m here if another question comes up. Remember, this guide offers general information and cannot replace care from a qualified professional.",
  },
];

function getGuideReply(message) {
  const topic = guideTopics.find((item) => item.pattern.test(message));
  if (topic) return topic.reply;

  return "I’m not sure I understood that yet. I can help with periods and the cycle tracker, body changes, emotional well-being, safety, finding ABENEST support, or exploring the Learn and Sisterhood sections. Please don’t share your full name, address, passwords, or other private details here.";
}

function addChatMessage(message, sender) {
  const bubble = document.createElement("div");
  const text = document.createElement("p");
  bubble.className = `chat-message ${sender === "user" ? "user-message" : "assistant-message"}`;
  text.textContent = message;
  bubble.appendChild(text);
  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function setChatOpen(isOpen) {
  chatPanel.hidden = !isOpen;
  chatToggle.setAttribute("aria-expanded", String(isOpen));
  if (isOpen) chatInput.focus();
  else chatToggle.focus();
}

if (chatPanel && chatToggle && chatForm && chatInput && chatMessages) {
  const configuredChatEndpoint =
    typeof window.ABENEST_CHAT_ENDPOINT === "string" && window.ABENEST_CHAT_ENDPOINT.trim();
  chatServiceConsentWrap.hidden = !configuredChatEndpoint;
  chatToggle.addEventListener("click", () => setChatOpen(chatPanel.hidden));
  guideBuddy?.addEventListener("click", () => setChatOpen(true));
  chatClose.addEventListener("click", () => setChatOpen(false));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !chatPanel.hidden) setChatOpen(false);
  });

  document.querySelectorAll("[data-chat-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
      chatInput.value = button.dataset.chatPrompt;
      chatForm.requestSubmit();
    });
  });

  chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;

    addChatMessage(message, "user");
    chatInput.value = "";
    chatInput.focus();

    const sendButton = chatForm.querySelector("button[type='submit']");
    sendButton.disabled = true;

    let reply = getGuideReply(message);
    const endpoint = window.ABENEST_CHAT_ENDPOINT;

    if (typeof endpoint === "string" && endpoint.trim() && chatServiceConsent.checked) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        });
        if (!response.ok) throw new Error("Chat service unavailable");
        const data = await response.json();
        if (typeof data.reply === "string" && data.reply.trim()) reply = data.reply.trim();
      } catch (error) {
        console.warn("ABENEST chat service unavailable; using the on-page guide instead.", error);
      }
    }

    addChatMessage(reply, "assistant");
    sendButton.disabled = false;
    chatInput.focus();
  });
}

/* Community Join Form Handler */
const communityJoinForm = document.getElementById("communityJoinForm");
const communityJoinStatus = document.getElementById("communityJoinStatus");

if (communityJoinForm) {
  communityJoinForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const fullName = document.getElementById("nestFullName").value.trim();
    const email = document.getElementById("nestEmail").value.trim();
    const role = document.getElementById("nestRole").value.trim();

    // Validate
    if (!fullName || !email || !role) {
      communityJoinStatus.textContent = "Please fill in all required fields.";
      communityJoinStatus.classList.add("error");
      communityJoinStatus.classList.remove("success");
      return;
    }

    // Build WhatsApp message
    const message = `Hi ABENEST! I'd like to join the community.\n\nName: ${fullName}\nEmail: ${email}\nInterested in: ${role}`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/250787248328?text=${encodedMessage}`;

    // Show success message
    communityJoinStatus.textContent = "Opening WhatsApp to complete your signup...";
    communityJoinStatus.classList.add("success");
    communityJoinStatus.classList.remove("error");

    // Open WhatsApp in new tab
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");

    // Reset form
    setTimeout(() => {
      communityJoinForm.reset();
      communityJoinStatus.textContent = "";
      communityJoinStatus.classList.remove("success", "error");
    }, 2000);
  });
}
