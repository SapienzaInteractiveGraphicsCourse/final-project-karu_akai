import portfolioSections from '../../content/portfolioSections.js';
import contactIcons from './contactIcons.js';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const ACADEMIC_SECTION_ID = 'academic';
const PROJECTS_SECTION_ID = 'projects';
const EXPERIENCE_SECTION_ID = 'experience';
const ACADEMIC_TAB_KEYS = new Set([
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
]);

export default class SectionPanel {
  constructor({ onClose } = {}) {
    this.onClose = onClose;
    this.panel = document.querySelector('#section-panel');
    this.title = document.querySelector('#section-panel-title');
    this.text = document.querySelector('#section-panel-text');
    this.contactLinks = document.createElement('div');
    this.contactLinks.className = 'panel-contact-links';
    this.text?.insertAdjacentElement('afterend', this.contactLinks);
    this.academicContent = document.createElement('div');
    this.academicContent.className = 'academic-content';
    this.academicContent.hidden = true;
    this.text?.insertAdjacentElement('afterend', this.academicContent);
    this.projectsContent = document.createElement('div');
    this.projectsContent.className = 'projects-content';
    this.projectsContent.hidden = true;
    this.text?.insertAdjacentElement('afterend', this.projectsContent);
    this.workExperienceContent = document.createElement('div');
    this.workExperienceContent.className = 'work-experience-content';
    this.workExperienceContent.hidden = true;
    this.text?.insertAdjacentElement('afterend', this.workExperienceContent);
    this.closeButton = document.querySelector('#close-panel');
    this.previousPageButton = document.querySelector('#previous-panel-page');
    this.nextPageButton = document.querySelector('#next-panel-page');
    this.currentSection = null;
    this.currentPages = [];
    this.currentPageIndex = 0;
    this.selectedAcademicIndex = 0;
    this.selectedProjectId = null;
    this.selectedWorkExperienceId = null;
    this.academicTabs = [];
    this.academicPanels = [];

    this.closeButton?.addEventListener('click', (event) => {
      event.stopPropagation();
      this.close({ notify: true });
    });

    this.previousPageButton?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.previousPage();
    });

    this.nextPageButton?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.nextPage();
    });
  }

  open(sectionId) {
    const section = portfolioSections[sectionId];

    if (!this.panel || !section) {
      return;
    }

    this.currentSection = sectionId;
    this.currentPages = section.pages;
    this.currentPageIndex = 0;
    this.selectedAcademicIndex = 0;
    this.selectedProjectId = null;
    this.selectedWorkExperienceId = null;
    this.panel.classList.toggle(
      'section-panel--academic',
      sectionId === ACADEMIC_SECTION_ID,
    );
    this.panel.classList.toggle(
      'section-panel--projects',
      sectionId === PROJECTS_SECTION_ID,
    );
    this.panel.classList.toggle(
      'section-panel--experience',
      sectionId === EXPERIENCE_SECTION_ID,
    );
    this.panel.classList.add('visible');
    this.renderCurrentPage();
  }

  close({ notify = false } = {}) {
    this.panel?.classList.remove('visible');
    this.resetState();

    if (notify) {
      this.onClose?.();
    }
  }

  nextPage() {
    if (this.currentPageIndex >= this.currentPages.length - 1) {
      return;
    }

    this.currentPageIndex += 1;
    this.renderCurrentPage();
  }

  previousPage() {
    if (this.currentPageIndex <= 0) {
      return;
    }

    this.currentPageIndex -= 1;
    this.renderCurrentPage();
  }

  renderCurrentPage() {
    const page = this.currentPages[this.currentPageIndex];

    if (!page) {
      if (this.previousPageButton) this.previousPageButton.hidden = true;
      if (this.nextPageButton) this.nextPageButton.hidden = true;
      return;
    }

    const isAcademicPage = Array.isArray(page.experiences);
    const isProjectsPage = Array.isArray(page.projects);
    const isWorkExperiencePage = Array.isArray(page.workExperiences);
    const isStructuredPage =
      isAcademicPage || isProjectsPage || isWorkExperiencePage;

    if (this.title) this.title.textContent = page.title ?? '';
    if (this.text) {
      this.text.hidden = isStructuredPage;
      this.text.textContent = isStructuredPage ? '' : (page.text ?? '');
    }

    if (isAcademicPage) {
      this.renderAcademicContent(page.experiences);
    } else {
      this.clearAcademicContent();
    }

    if (isProjectsPage) {
      this.renderProjectsContent(page);
    } else {
      this.clearProjectsContent();
    }

    if (isWorkExperiencePage) {
      this.renderWorkExperienceContent(page);
    } else {
      this.clearWorkExperienceContent();
    }

    this.renderContactLinks(page.links);

    if (this.previousPageButton) {
      this.previousPageButton.hidden = this.currentPageIndex === 0;
    }
    if (this.nextPageButton) {
      this.nextPageButton.hidden =
        this.currentPageIndex >= this.currentPages.length - 1;
    }
  }

  renderAcademicContent(experiences) {
    this.academicContent.replaceChildren();
    this.academicContent.hidden = false;
    this.academicTabs = [];
    this.academicPanels = [];

    const tabList = document.createElement('div');
    tabList.className = 'academic-tab-list';
    tabList.setAttribute('role', 'tablist');
    tabList.setAttribute('aria-label', 'Academic experiences');

    const panels = document.createElement('div');
    panels.className = 'academic-tab-panels';

    experiences.forEach((experience, index) => {
      const isSelected = index === this.selectedAcademicIndex;
      const tabId = `academic-tab-${index}`;
      const panelId = `academic-tab-panel-${index}`;

      const tab = document.createElement('button');
      tab.type = 'button';
      tab.id = tabId;
      tab.className = 'academic-tab';
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', String(isSelected));
      tab.setAttribute('aria-controls', panelId);
      tab.tabIndex = isSelected ? 0 : -1;
      tab.classList.toggle('is-active', isSelected);

      const tabNumber = document.createElement('span');
      tabNumber.className = 'academic-tab-number';
      tabNumber.textContent = String(index + 1).padStart(2, '0');

      const tabLabel = document.createElement('span');
      tabLabel.textContent = experience.tabLabel;

      tab.append(tabNumber, tabLabel);
      tab.addEventListener('click', () => this.selectAcademicTab(index));
      tab.addEventListener('keydown', (event) => {
        this.onAcademicTabKeyDown(event, index);
      });

      const panel = this.createAcademicPanel(
        experience,
        panelId,
        tabId,
        isSelected,
      );

      this.academicTabs.push(tab);
      this.academicPanels.push(panel);
      tabList.append(tab);
      panels.append(panel);
    });

    this.academicContent.append(tabList, panels);
  }

  createAcademicPanel(experience, panelId, tabId, isSelected) {
    const panel = document.createElement('section');
    panel.id = panelId;
    panel.className = 'academic-tab-panel';
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tabId);
    panel.tabIndex = 0;
    panel.hidden = !isSelected;

    const type = document.createElement('p');
    type.className = 'academic-type';
    type.textContent = experience.type;

    const headline = document.createElement('h3');
    headline.className = 'academic-headline';
    headline.textContent = experience.headline;

    const meta = document.createElement('div');
    meta.className = 'academic-meta';

    if (experience.institution) {
      const institution = document.createElement('p');
      institution.className = 'academic-institution';
      institution.textContent = experience.institution;
      meta.append(institution);
    }

    const period = document.createElement('p');
    period.className = 'academic-period';
    period.textContent = experience.period;
    meta.append(period);

    panel.append(type, headline, meta);

    if (experience.areasLabel && experience.areas?.length) {
      const areasSection = document.createElement('div');
      areasSection.className = 'academic-areas';

      const areasLabel = document.createElement('p');
      areasLabel.className = 'academic-areas-label';
      areasLabel.textContent = experience.areasLabel;

      const areasList = document.createElement('ul');
      areasList.className = 'academic-area-list';

      for (const area of experience.areas) {
        const item = document.createElement('li');
        item.textContent = area;
        areasList.append(item);
      }

      areasSection.append(areasLabel, areasList);
      panel.append(areasSection);
    }

    if (experience.description) {
      const description = document.createElement('p');
      description.className = 'academic-description';
      description.textContent = experience.description;
      panel.append(description);
    }

    return panel;
  }

  selectAcademicTab(index, { focus = false } = {}) {
    if (!this.academicTabs[index] || !this.academicPanels[index]) {
      return;
    }

    this.selectedAcademicIndex = index;

    this.academicTabs.forEach((tab, tabIndex) => {
      const isSelected = tabIndex === index;
      tab.setAttribute('aria-selected', String(isSelected));
      tab.tabIndex = isSelected ? 0 : -1;
      tab.classList.toggle('is-active', isSelected);
      this.academicPanels[tabIndex].hidden = !isSelected;
    });

    if (focus) {
      this.academicTabs[index].focus();
    }
  }

  onAcademicTabKeyDown(event, currentIndex) {
    if (!ACADEMIC_TAB_KEYS.has(event.key)) {
      return;
    }

    event.preventDefault();

    const lastIndex = this.academicTabs.length - 1;
    let nextIndex = currentIndex;

    if (event.key === 'ArrowRight') {
      nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = lastIndex;
    }

    this.selectAcademicTab(nextIndex, { focus: true });
  }

  clearAcademicContent() {
    this.academicContent.hidden = true;
    this.academicContent.replaceChildren();
    this.academicTabs = [];
    this.academicPanels = [];
  }

  renderProjectsContent(
    page,
    { focusBack = false, focusProjectId = null } = {},
  ) {
    this.projectsContent.hidden = false;

    const selectedProject = page.projects.find(
      (project) => project.id === this.selectedProjectId,
    );

    if (!selectedProject) {
      this.selectedProjectId = null;
      this.renderProjectIndex(page, focusProjectId);
      return;
    }

    this.renderProjectDetail(page, selectedProject);

    if (focusBack) {
      this.projectsContent.querySelector('.project-back-button')?.focus();
    }
  }

  renderProjectIndex(page, focusProjectId = null) {
    this.projectsContent.className =
      'projects-content projects-content--index';

    const index = document.createElement('section');
    index.className = 'project-index';
    index.setAttribute('aria-label', 'Project index');

    const introduction = this.createProjectTextElement(
      'p',
      'project-introduction',
      page.introduction,
    );

    const list = document.createElement('ol');
    list.className = 'project-index-list';

    for (const project of page.projects) {
      const item = document.createElement('li');
      item.className = 'project-index-item';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'project-index-button';
      button.dataset.projectId = project.id;
      button.setAttribute(
        'aria-label',
        `Open project ${project.number}: ${project.title}, ${project.category}, ${project.year}`,
      );
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        this.selectProject(project.id);
      });

      const number = this.createProjectTextElement(
        'span',
        'project-index-number',
        project.number,
      );
      number.setAttribute('aria-hidden', 'true');

      const copy = document.createElement('span');
      copy.className = 'project-index-copy';

      const title = this.createProjectTextElement(
        'span',
        'project-index-title',
        project.title,
      );
      const meta = this.createProjectTextElement(
        'span',
        'project-index-meta',
        `${project.indexCategory ?? project.category} · ${project.year}`,
      );

      const arrow = this.createProjectTextElement(
        'span',
        'project-index-arrow',
        '→',
      );
      arrow.setAttribute('aria-hidden', 'true');

      copy.append(title, meta);
      button.append(number, copy, arrow);
      item.append(button);
      list.append(item);
    }

    index.append(introduction, list);
    this.projectsContent.replaceChildren(index);

    if (focusProjectId) {
      const projectButton = [...this.projectsContent.querySelectorAll(
        '.project-index-button',
      )].find((button) => button.dataset.projectId === focusProjectId);
      projectButton?.focus();
    }
  }

  renderProjectDetail(page, project) {
    this.projectsContent.className =
      'projects-content projects-content--detail';

    const backButton = document.createElement('button');
    backButton.type = 'button';
    backButton.className = 'project-back-button';
    backButton.setAttribute(
      'aria-label',
      `Back to project index from ${project.title}`,
    );
    backButton.addEventListener('click', (event) => {
      event.stopPropagation();
      this.selectedProjectId = null;
      this.renderProjectsContent(page, { focusProjectId: project.id });
    });

    const backArrow = this.createProjectTextElement(
      'span',
      'project-back-arrow',
      '←',
    );
    backArrow.setAttribute('aria-hidden', 'true');
    const backLabel = this.createProjectTextElement(
      'span',
      'project-back-label',
      'Back to projects',
    );
    backButton.append(backArrow, backLabel);

    const detail = document.createElement('article');
    detail.className = 'project-detail';
    const titleId = `project-detail-title-${project.id}`;
    detail.setAttribute('aria-labelledby', titleId);

    const eyebrow = this.createProjectTextElement(
      'p',
      'project-detail-eyebrow',
      `${project.category} · ${project.year}`,
    );

    const title = this.createProjectTextElement(
      'h3',
      'project-detail-title',
      project.title,
    );
    title.id = titleId;

    const context = this.createProjectTextElement(
      'p',
      'project-detail-context',
      project.context,
    );

    detail.append(eyebrow, title, context);

    if (project.role) {
      const role = document.createElement('p');
      role.className = 'project-detail-role';
      const roleLabel = this.createProjectTextElement(
        'span',
        'project-detail-role-label',
        'Role',
      );
      role.append(roleLabel, ` · ${project.role}`);
      detail.append(role);
    }

    const description = this.createProjectTextElement(
      'p',
      'project-detail-description',
      project.description,
    );
    detail.append(description);

    detail.append(
      this.createProjectListSection(
        project.contributionsLabel ?? 'Main contributions',
        project.contributions,
        'project-contribution-list',
      ),
    );

    if (project.results?.length) {
      detail.append(this.createProjectResults(project.results));
    }

    detail.append(
      this.createProjectListSection(
        'Technologies',
        project.technologies,
        'project-technology-list',
      ),
    );

    this.projectsContent.replaceChildren(backButton, detail);
  }

  createProjectListSection(label, items, listClassName) {
    const section = document.createElement('section');
    section.className = 'project-detail-section';

    const heading = this.createProjectTextElement(
      'h4',
      'project-detail-section-title',
      label,
    );
    const list = document.createElement('ul');
    list.className = listClassName;

    for (const itemText of items) {
      const item = document.createElement('li');
      item.textContent = itemText;
      list.append(item);
    }

    section.append(heading, list);
    return section;
  }

  createProjectResults(results) {
    const section = document.createElement('section');
    section.className = 'project-detail-section';
    const heading = this.createProjectTextElement(
      'h4',
      'project-detail-section-title',
      'Results',
    );
    const list = document.createElement('dl');
    list.className = 'project-results';

    for (const result of results) {
      const group = document.createElement('div');
      group.className = 'project-result';
      const label = this.createProjectTextElement(
        'dt',
        'project-result-label',
        result.label,
      );
      const value = this.createProjectTextElement(
        'dd',
        'project-result-value',
        result.value,
      );
      group.append(label, value);
      list.append(group);
    }

    section.append(heading, list);
    return section;
  }

  createProjectTextElement(tagName, className, text) {
    const element = document.createElement(tagName);
    element.className = className;
    element.textContent = text;
    return element;
  }

  selectProject(projectId) {
    const page = this.currentPages[this.currentPageIndex];

    if (!page?.projects?.some((project) => project.id === projectId)) {
      return;
    }

    this.selectedProjectId = projectId;
    this.renderProjectsContent(page, { focusBack: true });
  }

  clearProjectsContent() {
    this.projectsContent.hidden = true;
    this.projectsContent.className = 'projects-content';
    this.projectsContent.replaceChildren();
  }

  renderWorkExperienceContent(
    page,
    { focusBack = false, focusExperienceId = null } = {},
  ) {
    this.workExperienceContent.hidden = false;

    const selectedExperience = page.workExperiences.find(
      (experience) => experience.id === this.selectedWorkExperienceId,
    );

    if (!selectedExperience) {
      this.selectedWorkExperienceId = null;
      this.renderWorkExperienceIndex(page, focusExperienceId);
      return;
    }

    this.renderWorkExperienceDetail(page, selectedExperience);

    if (focusBack) {
      this.workExperienceContent
        .querySelector('.project-back-button')
        ?.focus();
    }
  }

  renderWorkExperienceIndex(page, focusExperienceId = null) {
    this.workExperienceContent.className =
      'work-experience-content projects-content--index';

    const index = document.createElement('section');
    index.className = 'project-index';
    index.setAttribute('aria-label', 'Work experience index');

    const list = document.createElement('ol');
    list.className = 'project-index-list';

    for (const experience of page.workExperiences) {
      const item = document.createElement('li');
      item.className = 'project-index-item';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'project-index-button';
      button.dataset.experienceId = experience.id;
      button.setAttribute(
        'aria-label',
        `Open work experience ${experience.number}: ${experience.title}, ${experience.company}, ${experience.period}`,
      );
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        this.selectWorkExperience(experience.id);
      });

      const number = this.createProjectTextElement(
        'span',
        'project-index-number',
        experience.number,
      );
      number.setAttribute('aria-hidden', 'true');

      const copy = document.createElement('span');
      copy.className = 'project-index-copy';

      const title = this.createProjectTextElement(
        'span',
        'project-index-title',
        experience.title,
      );
      const meta = this.createProjectTextElement(
        'span',
        'project-index-meta',
        `${experience.company} · ${experience.period}`,
      );

      const arrow = this.createProjectTextElement(
        'span',
        'project-index-arrow',
        '→',
      );
      arrow.setAttribute('aria-hidden', 'true');

      copy.append(title, meta);
      button.append(number, copy, arrow);
      item.append(button);
      list.append(item);
    }

    index.append(list);
    this.workExperienceContent.replaceChildren(index);

    if (focusExperienceId) {
      const experienceButton = [
        ...this.workExperienceContent.querySelectorAll(
          '.project-index-button',
        ),
      ].find(
        (button) => button.dataset.experienceId === focusExperienceId,
      );
      experienceButton?.focus();
    }
  }

  renderWorkExperienceDetail(page, experience) {
    this.workExperienceContent.className =
      'work-experience-content projects-content--detail';

    const backButton = document.createElement('button');
    backButton.type = 'button';
    backButton.className = 'project-back-button';
    backButton.setAttribute(
      'aria-label',
      `Back to work experience index from ${experience.title}`,
    );
    backButton.addEventListener('click', (event) => {
      event.stopPropagation();
      this.selectedWorkExperienceId = null;
      this.renderWorkExperienceContent(page, {
        focusExperienceId: experience.id,
      });
    });

    const backArrow = this.createProjectTextElement(
      'span',
      'project-back-arrow',
      '←',
    );
    backArrow.setAttribute('aria-hidden', 'true');
    const backLabel = this.createProjectTextElement(
      'span',
      'project-back-label',
      'Back to experience',
    );
    backButton.append(backArrow, backLabel);

    const detail = document.createElement('article');
    detail.className = 'project-detail';
    const titleId = `work-experience-detail-title-${experience.id}`;
    detail.setAttribute('aria-labelledby', titleId);

    const period = this.createProjectTextElement(
      'p',
      'project-detail-eyebrow',
      experience.period,
    );
    const title = this.createProjectTextElement(
      'h3',
      'project-detail-title',
      experience.title,
    );
    title.id = titleId;
    const context = this.createProjectTextElement(
      'p',
      'project-detail-context',
      `${experience.company} · ${experience.location}`,
    );
    const summary = this.createProjectTextElement(
      'p',
      'project-detail-description',
      experience.summary,
    );

    detail.append(period, title, context, summary);
    detail.append(
      this.createProjectListSection(
        'Responsibilities',
        experience.responsibilities,
        'project-contribution-list',
      ),
    );

    if (experience.technologies?.length) {
      detail.append(
        this.createProjectListSection(
          'Technologies',
          experience.technologies,
          'project-technology-list',
        ),
      );
    }

    this.workExperienceContent.replaceChildren(backButton, detail);
  }

  selectWorkExperience(experienceId) {
    const page = this.currentPages[this.currentPageIndex];

    if (
      !page?.workExperiences?.some(
        (experience) => experience.id === experienceId,
      )
    ) {
      return;
    }

    this.selectedWorkExperienceId = experienceId;
    this.renderWorkExperienceContent(page, { focusBack: true });
  }

  clearWorkExperienceContent() {
    this.selectedWorkExperienceId = null;
    this.workExperienceContent.hidden = true;
    this.workExperienceContent.className = 'work-experience-content';
    this.workExperienceContent.replaceChildren();
  }

  renderContactLinks(links = []) {
    this.contactLinks.replaceChildren();

    for (const contact of links) {
      const icon = contactIcons[contact.icon];

      if (!icon?.path || !contact.href) {
        continue;
      }

      const link = document.createElement('a');
      link.className = 'panel-contact-link';
      link.href = contact.href;
      link.setAttribute('aria-label', contact.label ?? contact.icon);

      if (contact.external) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }

      const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('aria-hidden', 'true');

      const path = document.createElementNS(SVG_NAMESPACE, 'path');
      path.setAttribute('d', icon.path);
      path.setAttribute('fill', 'currentColor');

      svg.append(path);
      link.append(svg);
      this.contactLinks.append(link);
    }
  }

  resetState() {
    this.currentSection = null;
    this.currentPages = [];
    this.currentPageIndex = 0;
    this.selectedAcademicIndex = 0;
    this.selectedProjectId = null;
    this.selectedWorkExperienceId = null;
    this.panel?.classList.remove('section-panel--academic');
    this.panel?.classList.remove('section-panel--projects');
    this.panel?.classList.remove('section-panel--experience');
    this.clearAcademicContent();
    this.clearProjectsContent();
    this.clearWorkExperienceContent();

    if (this.text) this.text.hidden = false;
    this.contactLinks.replaceChildren();

    if (this.previousPageButton) this.previousPageButton.hidden = true;
    if (this.nextPageButton) this.nextPageButton.hidden = true;
  }

  contains(target) {
    return Boolean(this.panel?.contains(target));
  }
}
