// Cover Letter Generator App Logic

class CoverLetterApp {
    constructor() {
        this.profile = {
            name: '',
            contact: '',
            location: '',
            education: {
                university: '',
                degreeType: '',
                major: '',
                start: '',
                end: '',
                gpa: ''
            },
            skills: [],
            experiences: [],
            projects: [],
            extras: []
        };
        this.currentView = 'cover-letter'; // 'cover-letter' or 'resume'
        this.lastApiCall = null;
        
        // Initialize after a brief delay to ensure DOM is ready
        setTimeout(() => this.init(), 100);
    }

    async init() {
        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }
        
        await this.loadData();
        this.setupEventListeners();
        this.setupAutosave();
        this.renderProfile();
    }

    // Data Management
    async loadData() {
        try {
            const result = await chrome.storage.local.get(['profile']);
            if (result.profile) {
                this.profile = { ...this.profile, ...result.profile };
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    async saveData() {
        try {
            await chrome.storage.local.set({
                profile: this.profile
            });
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }

    setupAutosave() {
        let saveTimeout;
        const autosave = () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                this.saveData();
            }, 1000); // 1 second debounce
        };

        // Autosave on profile field changes
        const profileFields = ['profile-name', 'profile-contact', 'profile-location', 'profile-university', 'profile-degree-type', 'profile-major', 'profile-education-start', 'profile-education-end', 'profile-education-gpa'];
        profileFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', autosave);
            }
        });

        // Autosave on job text changes
        const jobTextArea = document.getElementById('job-text');
        if (jobTextArea) {
            jobTextArea.addEventListener('input', autosave);
        }
    }

    // Event Listeners
    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Profile management
        document.getElementById('save-profile')?.addEventListener('click', () => {
            this.saveProfile();
        });

        document.getElementById('import-profile')?.addEventListener('click', () => {
            document.getElementById('import-file').click();
        });

        document.getElementById('export-profile')?.addEventListener('click', () => {
            this.exportProfile();
        });

        document.getElementById('import-file')?.addEventListener('change', (e) => {
            this.importProfile(e.target.files[0]);
        });

        // Skills management
        document.getElementById('skills-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addSkill(e.target.value.trim());
                e.target.value = '';
            }
        });

        // Experience and project management
        document.getElementById('add-experience')?.addEventListener('click', () => {
            this.addExperience();
        });

        document.getElementById('add-project')?.addEventListener('click', () => {
            this.addProject();
        });

        document.getElementById('add-extra')?.addEventListener('click', () => {
            this.addExtra();
        });

        // Cover letter generation
        document.getElementById('generate-btn')?.addEventListener('click', () => {
            this.generateCoverLetter();
        });

        document.getElementById('download-pdf')?.addEventListener('click', () => {
            this.downloadPDF();
        });

        // Resume generation
        document.getElementById('generate-resume-btn')?.addEventListener('click', () => {
            this.generateResume();
        });

        document.getElementById('download-resume-pdf')?.addEventListener('click', () => {
            this.downloadResumePDF();
        });

        // Error handling
        document.getElementById('retry-btn')?.addEventListener('click', () => {
            this.hideError();
            this.generateCoverLetter();
        });

        document.getElementById('save-logs-btn')?.addEventListener('click', () => {
            this.saveLogs();
        });

        document.querySelector('.modal-close')?.addEventListener('click', () => {
            this.hideError();
        });

        // Profile field updates
        document.getElementById('profile-name')?.addEventListener('input', (e) => {
            this.profile.name = e.target.value;
        });

        document.getElementById('profile-contact')?.addEventListener('input', (e) => {
            this.profile.contact = e.target.value;
        });

        document.getElementById('profile-location')?.addEventListener('input', (e) => {
            this.profile.location = e.target.value;
        });

        document.getElementById('profile-university')?.addEventListener('input', (e) => {
            this.profile.education.university = e.target.value;
        });

        document.getElementById('profile-degree-type')?.addEventListener('input', (e) => {
            this.profile.education.degreeType = e.target.value;
        });

        document.getElementById('profile-major')?.addEventListener('input', (e) => {
            this.profile.education.major = e.target.value;
        });

        document.getElementById('profile-education-start')?.addEventListener('input', (e) => {
            this.profile.education.start = e.target.value;
        });

        document.getElementById('profile-education-end')?.addEventListener('input', (e) => {
            this.profile.education.end = e.target.value;
        });

        document.getElementById('profile-education-gpa')?.addEventListener('input', (e) => {
            this.profile.education.gpa = e.target.value;
        });
    }

    // UI Management
    switchTab(tabName) {
        try {
            // Update tab buttons
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            const activeTabBtn = document.querySelector(`[data-tab="${tabName}"]`);
            if (activeTabBtn) activeTabBtn.classList.add('active');

            // Update tab content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            const activeTabContent = document.getElementById(`${tabName}-tab`);
            if (activeTabContent) activeTabContent.classList.add('active');
        } catch (error) {
            console.error('Error switching tabs:', error);
        }
    }

    showLoading() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) loadingOverlay.classList.remove('hidden');
    }

    hideLoading() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
    }

    showError(message, canRetry = true) {
        const errorMessage = document.getElementById('error-message');
        const retryBtn = document.getElementById('retry-btn');
        const errorModal = document.getElementById('error-modal');
        
        if (errorMessage) errorMessage.textContent = message;
        if (retryBtn) retryBtn.style.display = canRetry ? 'inline-flex' : 'none';
        if (errorModal) errorModal.classList.remove('hidden');
    }

    hideError() {
        const errorModal = document.getElementById('error-modal');
        if (errorModal) errorModal.classList.add('hidden');
    }

    showStatus(message, type = 'loading') {
        const statusEl = document.getElementById('generation-status');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = `status-message status-${type}`;
        }
    }

    // Profile Management
    renderProfile() {
        // Safely set profile field values
        const setFieldValue = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.value = value || '';
        };
        
        setFieldValue('profile-name', this.profile.name);
        setFieldValue('profile-contact', this.profile.contact);
        setFieldValue('profile-location', this.profile.location);
        setFieldValue('profile-university', this.profile.education?.university);
        setFieldValue('profile-degree-type', this.profile.education?.degreeType);
        setFieldValue('profile-major', this.profile.education?.major);
        setFieldValue('profile-education-start', this.profile.education?.start);
        setFieldValue('profile-education-end', this.profile.education?.end);
        setFieldValue('profile-education-gpa', this.profile.education?.gpa);
        
        this.renderSkills();
        this.renderExperiences();
        this.renderProjects();
        this.renderExtras();
    }

    renderSkills() {
        const container = document.getElementById('skills-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.profile.skills.forEach((skill, index) => {
            const skillEl = document.createElement('div');
            skillEl.className = 'skill-tag';
            skillEl.innerHTML = `
                ${skill}
                <button class="skill-remove" data-index="${index}">&times;</button>
            `;
            container.appendChild(skillEl);
        });

        // Add event listeners for remove buttons
        container.querySelectorAll('.skill-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.removeSkill(parseInt(e.target.dataset.index));
            });
        });
    }

    addSkill(skill) {
        if (skill && !this.profile.skills.includes(skill)) {
            this.profile.skills.push(skill);
            this.renderSkills();
            this.saveData();
        }
    }

    removeSkill(index) {
        this.profile.skills.splice(index, 1);
        this.renderSkills();
        this.saveData();
    }

    renderExperiences() {
        const container = document.getElementById('experiences-container');
        if (!container) return;
        
        container.innerHTML = '';

        this.profile.experiences.forEach((exp, index) => {
            const expEl = this.createExperienceElement(exp, index);
            container.appendChild(expEl);
        });
    }

    createExperienceElement(exp, index) {
        const div = document.createElement('div');
        div.className = 'experience-card';
        div.innerHTML = `
            <div class="card-header">
                <div class="card-title">
                    <input type="text" placeholder="Job Title" value="${exp.title || ''}" data-field="title" data-index="${index}">
                    <input type="text" placeholder="Company" value="${exp.company || ''}" data-field="company" data-index="${index}">
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.5rem; margin-top: 0.5rem;">
                        <input type="text" placeholder="Start Date" value="${exp.start || ''}" data-field="start" data-index="${index}">
                        <input type="text" placeholder="End Date" value="${exp.end || ''}" data-field="end" data-index="${index}">
                        <input type="text" placeholder="Location" value="${exp.location || ''}" data-field="location" data-index="${index}">
                    </div>
                    <textarea placeholder="Role description (what you did in this role)..." style="margin-top: 0.5rem; min-height: 60px;" data-field="description" data-index="${index}">${(exp.description || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
                </div>
                <div class="card-actions">
                    <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem;">
                        <input type="checkbox" class="must-include-exp" data-index="${index}" ${exp.mustInclude ? 'checked' : ''}>
                        Must Include on Resume
                    </label>
                    <button class="btn btn-secondary btn-sm add-bullet" data-index="${index}">Add Achievement</button>
                    <button class="btn btn-danger btn-sm remove-experience" data-index="${index}">Remove</button>
                </div>
            </div>
            <div class="bullet-list" data-index="${index}">
                <label style="font-weight: 500; margin-bottom: 0.5rem; display: block;">Key Achievements:</label>
                ${(exp.bullets || []).map((bullet, bulletIndex) => `
                    <div class="bullet-item">
                        <input type="text" placeholder="Specific achievement with metrics if possible..." value="${bullet}" data-bullet-index="${bulletIndex}">
                        <button class="bullet-remove" data-exp-index="${index}" data-bullet-index="${bulletIndex}">&times;</button>
                    </div>
                `).join('')}
            </div>
        `;

        // Add event listeners
        div.querySelectorAll('input[data-field], textarea[data-field]').forEach(input => {
            input.addEventListener('input', (e) => {
                const field = e.target.dataset.field;
                const expIndex = parseInt(e.target.dataset.index);
                this.profile.experiences[expIndex][field] = e.target.value;
                this.saveData();
            });
        });

        div.querySelectorAll('input[data-bullet-index]').forEach(input => {
            input.addEventListener('input', (e) => {
                const expIndex = index;
                const bulletIndex = parseInt(e.target.dataset.bulletIndex);
                this.profile.experiences[expIndex].bullets[bulletIndex] = e.target.value;
                this.saveData();
            });
        });

        div.querySelector('.add-bullet').addEventListener('click', () => {
            this.addExperienceBullet(index);
        });

        div.querySelector('.remove-experience').addEventListener('click', () => {
            this.removeExperience(index);
        });

        div.querySelector('.must-include-exp').addEventListener('change', (e) => {
            this.profile.experiences[index].mustInclude = e.target.checked;
            this.saveData();
        });

        div.querySelectorAll('.bullet-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const expIndex = parseInt(e.target.dataset.expIndex);
                const bulletIndex = parseInt(e.target.dataset.bulletIndex);
                this.removeExperienceBullet(expIndex, bulletIndex);
            });
        });

        return div;
    }

    addExperience() {
        const newExp = {
            id: Date.now().toString(),
            title: '',
            company: '',
            start: '',
            end: '',
            location: '',
            description: '',
            bullets: [],
            mustInclude: false
        };
        this.profile.experiences.push(newExp);
        this.renderExperiences();
        this.saveData();
    }

    removeExperience(index) {
        this.profile.experiences.splice(index, 1);
        this.renderExperiences();
        this.saveData();
    }

    addExperienceBullet(expIndex) {
        if (!this.profile.experiences[expIndex].bullets) {
            this.profile.experiences[expIndex].bullets = [];
        }
        this.profile.experiences[expIndex].bullets.push('');
        this.renderExperiences();
        this.saveData();
    }

    removeExperienceBullet(expIndex, bulletIndex) {
        this.profile.experiences[expIndex].bullets.splice(bulletIndex, 1);
        this.renderExperiences();
        this.saveData();
    }

    renderProjects() {
        const container = document.getElementById('projects-container');
        if (!container) return;
        
        container.innerHTML = '';

        this.profile.projects.forEach((project, index) => {
            const projectEl = this.createProjectElement(project, index);
            container.appendChild(projectEl);
        });
    }

    createProjectElement(project, index) {
        const div = document.createElement('div');
        div.className = 'project-card';
        div.innerHTML = `
            <div class="card-header">
                <div class="card-title">
                    <input type="text" placeholder="Project Name" value="${project.name || ''}" data-field="name" data-index="${index}">
                    <textarea placeholder="Project description (what it does, technologies used)..." style="margin-top: 0.5rem; min-height: 60px;" data-field="description" data-index="${index}">${(project.description || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
                </div>
                <div class="card-actions">
                    <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem;">
                        <input type="checkbox" class="must-include-proj" data-index="${index}" ${project.mustInclude ? 'checked' : ''}>
                        Must Include on Resume
                    </label>
                    <button class="btn btn-secondary btn-sm add-bullet" data-index="${index}">Add Detail</button>
                    <button class="btn btn-danger btn-sm remove-project" data-index="${index}">Remove</button>
                </div>
            </div>
            <div class="bullet-list" data-index="${index}">
                <label style="font-weight: 500; margin-bottom: 0.5rem; display: block;">Key Details/Achievements:</label>
                ${(project.bullets || []).map((bullet, bulletIndex) => `
                    <div class="bullet-item">
                        <input type="text" placeholder="Technical detail, impact, or achievement..." value="${bullet}" data-bullet-index="${bulletIndex}">
                        <button class="bullet-remove" data-proj-index="${index}" data-bullet-index="${bulletIndex}">&times;</button>
                    </div>
                `).join('')}
            </div>
        `;

        // Add event listeners
        div.querySelectorAll('input[data-field], textarea[data-field]').forEach(input => {
            input.addEventListener('input', (e) => {
                const field = e.target.dataset.field;
                this.profile.projects[index][field] = e.target.value;
                this.saveData();
            });
        });

        div.querySelectorAll('input[data-bullet-index]').forEach(input => {
            input.addEventListener('input', (e) => {
                const bulletIndex = parseInt(e.target.dataset.bulletIndex);
                this.profile.projects[index].bullets[bulletIndex] = e.target.value;
                this.saveData();
            });
        });

        div.querySelector('.add-bullet').addEventListener('click', () => {
            this.addProjectBullet(index);
        });

        div.querySelector('.remove-project').addEventListener('click', () => {
            this.removeProject(index);
        });

        div.querySelector('.must-include-proj').addEventListener('change', (e) => {
            this.profile.projects[index].mustInclude = e.target.checked;
            this.saveData();
        });

        div.querySelectorAll('.bullet-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const projIndex = parseInt(e.target.dataset.projIndex);
                const bulletIndex = parseInt(e.target.dataset.bulletIndex);
                this.removeProjectBullet(projIndex, bulletIndex);
            });
        });

        return div;
    }

    addProject() {
        const newProject = {
            id: Date.now().toString(),
            name: '',
            description: '',
            bullets: [],
            mustInclude: false
        };
        this.profile.projects.push(newProject);
        this.renderProjects();
        this.saveData();
    }

    removeProject(index) {
        this.profile.projects.splice(index, 1);
        this.renderProjects();
        this.saveData();
    }

    addProjectBullet(projIndex) {
        if (!this.profile.projects[projIndex].bullets) {
            this.profile.projects[projIndex].bullets = [];
        }
        this.profile.projects[projIndex].bullets.push('');
        this.renderProjects();
        this.saveData();
    }

    removeProjectBullet(projIndex, bulletIndex) {
        this.profile.projects[projIndex].bullets.splice(bulletIndex, 1);
        this.renderProjects();
        this.saveData();
    }

    // Extras Management
    renderExtras() {
        const container = document.getElementById('extras-container');
        if (!container) return;
        
        container.innerHTML = '';

        this.profile.extras.forEach((extra, index) => {
            const extraEl = this.createExtraElement(extra, index);
            container.appendChild(extraEl);
        });
    }

    createExtraElement(extra, index) {
        const div = document.createElement('div');
        div.className = 'experience-card'; // Reuse same styling
        div.innerHTML = `
            <div class="card-header">
                <div class="card-title">
                    <input type="text" placeholder="Title/Type (e.g., Research Assistant, Certification)" value="${extra.title || ''}" data-field="title" data-index="${index}">
                    <input type="text" placeholder="Organization/Institution" value="${extra.organization || ''}" data-field="organization" data-index="${index}">
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.5rem; margin-top: 0.5rem;">
                        <select data-field="type" data-index="${index}" style="padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 0.375rem;">
                            <option value="research" ${extra.type === 'research' ? 'selected' : ''}>Research</option>
                            <option value="program" ${extra.type === 'program' ? 'selected' : ''}>Program</option>
                            <option value="certification" ${extra.type === 'certification' ? 'selected' : ''}>Certification</option>
                            <option value="award" ${extra.type === 'award' ? 'selected' : ''}>Award</option>
                        </select>
                        <input type="text" placeholder="Start Date" value="${extra.start || ''}" data-field="start" data-index="${index}">
                        <input type="text" placeholder="End Date (or 'Present')" value="${extra.end || ''}" data-field="end" data-index="${index}">
                    </div>
                    <textarea placeholder="Description of the experience, achievement, or certification..." style="margin-top: 0.5rem; min-height: 80px;" data-field="description" data-index="${index}">${(extra.description || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
                </div>
                <div class="card-actions">
                    <button class="btn btn-danger btn-sm remove-extra" data-index="${index}">Remove</button>
                </div>
            </div>
        `;

        // Add event listeners
        div.querySelectorAll('input[data-field], textarea[data-field], select[data-field]').forEach(input => {
            input.addEventListener('input', (e) => {
                const field = e.target.dataset.field;
                const extraIndex = parseInt(e.target.dataset.index);
                this.profile.extras[extraIndex][field] = e.target.value;
                this.saveData();
            });
            
            input.addEventListener('change', (e) => {
                const field = e.target.dataset.field;
                const extraIndex = parseInt(e.target.dataset.index);
                this.profile.extras[extraIndex][field] = e.target.value;
                this.saveData();
            });
        });

        div.querySelector('.remove-extra').addEventListener('click', () => {
            this.removeExtra(index);
        });

        return div;
    }

    addExtra() {
        const newExtra = {
            id: Date.now().toString(),
            title: '',
            organization: '',
            type: 'program',
            start: '',
            end: '',
            description: ''
        };
        this.profile.extras.push(newExtra);
        this.renderExtras();
        this.saveData();
    }

    removeExtra(index) {
        this.profile.extras.splice(index, 1);
        this.renderExtras();
        this.saveData();
    }

    saveProfile() {
        this.saveData();
                this.showStatus('Profile saved successfully!', 'success');
                setTimeout(() => {
                    const statusEl = document.getElementById('generation-status');
                    if (statusEl) {
                        statusEl.textContent = '';
                    }
                }, 3000);
    }

    exportProfile() {
        const dataStr = JSON.stringify(this.profile, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `cover-letter-profile-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
    }

    async importProfile(file) {
        if (!file) return;
        
        try {
            const text = await file.text();
            const importedProfile = JSON.parse(text);
            
            // Validate profile structure
            if (typeof importedProfile === 'object') {
                this.profile = { ...this.profile, ...importedProfile };
                this.renderProfile();
                this.saveData();
                this.showStatus('Profile imported successfully!', 'success');
                setTimeout(() => {
                    const statusEl = document.getElementById('generation-status');
                    if (statusEl) {
                        statusEl.textContent = '';
                    }
                }, 3000);
            } else {
                throw new Error('Invalid profile format');
            }
        } catch (error) {
            this.showError('Failed to import profile. Please check the file format.');
        }
    }

    // Cover Letter Generation
    async generateCoverLetter() {
        const jobText = document.getElementById('job-text').value.trim();
        
        if (!jobText) {
            this.showError('Please enter a job description.', false);
            return;
        }

        if (!this.profile.name) {
            this.showError('Please complete your profile first.', false);
            return;
        }

        this.showLoading();
        this.showStatus('Generating cover letter...', 'loading');

        try {
            const requestData = {
                profile: this.profile,
                jobText: jobText
            };

            this.lastApiCall = {
                request: requestData,
                timestamp: new Date().toISOString()
            };

            const response = await fetch('http://localhost:8787/generateCoverLetter', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const result = await response.json();
            this.lastApiCall.response = result;


            // Display the cover letter
            this.displayCoverLetter(result.coverLetter);
            this.switchToCoverLetterView();
            
            // Save data
            await this.saveData();

            this.showStatus('Cover letter generated successfully!', 'success');
            const downloadBtn = document.getElementById('download-pdf');
            if (downloadBtn) downloadBtn.disabled = false;

        } catch (error) {
            console.error('Generation error:', error);
            this.showError(`Failed to generate cover letter: ${error.message}`);
            this.showStatus('Generation failed', 'error');
        } finally {
            this.hideLoading();
        }
    }

    displayCoverLetter(coverLetter) {
        // Switch to generate tab to ensure the preview element is visible
        this.switchTab('generate');
        
        // Wait a bit for tab switch to complete
        setTimeout(() => {
            const previewEl = document.querySelector('.letter-content');
            
            if (!previewEl) {
                console.error('Letter content element not found even after tab switch');
                return;
            }
            
            // Format the cover letter with proper structure
            const formattedLetter = this.formatCoverLetter(coverLetter);
            previewEl.innerHTML = formattedLetter;
        }, 100);
    }

    formatCoverLetter(coverLetter) {
        // Clean and properly format the cover letter
        const cleanLetter = coverLetter.trim();
        
        // Split into paragraphs using double line breaks
        const paragraphs = cleanLetter.split(/\n\n+/)
            .map(p => p.replace(/\n/g, ' ').trim())
            .filter(p => p.length > 10); // Filter out very short lines
        
        console.log('Formatting cover letter with', paragraphs.length, 'paragraphs');
        
        let formatted = `
            <div class="letter-header">
                <p><strong>${this.profile.name}</strong></p>
                <p>${this.profile.contact.replace(/\n/g, '<br>')}</p>
            </div>
            
            <div class="letter-date">
                <p>${new Date().toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                })}</p>
            </div>
            
            <p>Dear Hiring Manager,</p>
            
            <div class="letter-body">
        `;

        // Add each paragraph with proper spacing
        paragraphs.forEach((paragraph, index) => {
            if (paragraph.trim()) {
                console.log(`Paragraph ${index + 1}:`, paragraph.substring(0, 100) + '...');
                formatted += `<p style="margin-bottom: 1.5em; text-align: justify; line-height: 1.6;">${paragraph}</p>`;
            }
        });

        formatted += `
            </div>
            
            <div class="letter-closing" style="margin-top: 2em;">
                <p>Sincerely,</p>
                <br>
                <p>${this.profile.name}</p>
            </div>
        `;

        return formatted;
    }

    async downloadPDF() {
        try {
            // Show loading
            this.showStatus('Generating PDF...', 'loading');
            
            // Get the cover letter content
            const letterElement = document.querySelector('.letter-content');
            if (!letterElement) {
                throw new Error('No cover letter to download');
            }

            // Create PDF using jsPDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'in',
                format: 'letter'
            });

            // Set font
            doc.setFont('times', 'normal');
            doc.setFontSize(11);

            // Margins
            const leftMargin = 1;
            const rightMargin = 1;
            const topMargin = 0.75;
            const lineHeight = 0.2;
            const pageWidth = 8.5;
            const textWidth = pageWidth - leftMargin - rightMargin;

            let currentY = topMargin;

            // Add header (name and contact)
            doc.setFontSize(12);
            doc.setFont('times', 'bold');
            doc.text(this.profile.name, leftMargin, currentY);
            currentY += lineHeight;

            doc.setFontSize(11);
            doc.setFont('times', 'normal');
            
            // Add contact info
            const contactLines = this.profile.contact.split('\n');
            contactLines.forEach(line => {
                if (line.trim()) {
                    doc.text(line.trim(), leftMargin, currentY);
                    currentY += lineHeight;
                }
            });

            currentY += lineHeight; // Extra space

            // Add date
            const today = new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            doc.text(today, leftMargin, currentY);
            currentY += lineHeight * 2;

            // Add salutation
            doc.text('Dear Hiring Manager,', leftMargin, currentY);
            currentY += lineHeight * 2;

            // Get the actual generated cover letter from the formatted content
            const letterBodyDiv = letterElement.querySelector('.letter-body');
            let letterContent = '';
            
            if (letterBodyDiv) {
                // Extract just the paragraphs from the letter body
                const paragraphs = letterBodyDiv.querySelectorAll('p');
                letterContent = Array.from(paragraphs).map(p => p.textContent.trim()).filter(text => text).join('\n\n');
            } else {
                // Fallback: get all text and clean it
                letterContent = letterElement.textContent || letterElement.innerText;
                letterContent = letterContent
                    .replace(/Your generated cover letter will appear here\.\.\./, '')
                    .replace(/Harish Subburaj[\s\S]*?Dear Hiring Manager,/, '')
                    .replace(/Sincerely,[\s\S]*$/, '')
                    .trim();
            }

            // Split content into clean paragraphs
            const paragraphs = letterContent.split(/\n\s*\n/).filter(p => p.trim());

            // Add paragraphs with proper wrapping
            paragraphs.forEach(paragraph => {
                if (paragraph.trim()) {
                    const lines = doc.splitTextToSize(paragraph.trim(), textWidth);
                    lines.forEach(line => {
                        if (currentY > 10) { // If near bottom of page
                            doc.addPage();
                            currentY = topMargin;
                        }
                        doc.text(line, leftMargin, currentY);
                        currentY += lineHeight;
                    });
                    currentY += lineHeight; // Extra space between paragraphs
                }
            });

            // Add closing
            currentY += lineHeight;
            doc.text('Sincerely,', leftMargin, currentY);
            currentY += lineHeight * 3;
            doc.text(this.profile.name, leftMargin, currentY);

            // Generate filename
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `cover-letter-${timestamp}.pdf`;

            // Convert to blob
            const pdfBlob = doc.output('blob');
            
            // Create download URL
            const url = URL.createObjectURL(pdfBlob);
            
            // Use Chrome downloads API for direct download
            if (chrome && chrome.downloads) {
                chrome.downloads.download({
                    url: url,
                    filename: filename,
                    saveAs: false // Download directly to Downloads folder
                }, (downloadId) => {
                    if (chrome.runtime.lastError) {
                        console.error('Download failed:', chrome.runtime.lastError);
                        // Fallback to regular download
                        this.fallbackDownload(url, filename);
                    } else {
                        this.showStatus('PDF downloaded successfully!', 'success');
                        setTimeout(() => {
                            const statusEl = document.getElementById('generation-status');
                            if (statusEl) statusEl.textContent = '';
                        }, 3000);
                    }
                    
                    // Clean up
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                });
            } else {
                // Fallback for non-extension environment
                this.fallbackDownload(url, filename);
            }

        } catch (error) {
            console.error('PDF generation error:', error);
            this.showError('Failed to generate PDF. Please try again.');
            this.showStatus('PDF generation failed', 'error');
        }
    }

    fallbackDownload(url, filename) {
        // Fallback download method
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showStatus('PDF downloaded successfully!', 'success');
        setTimeout(() => {
            const statusEl = document.getElementById('generation-status');
            if (statusEl) statusEl.textContent = '';
        }, 3000);
        
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    // Resume Generation Methods
    async generateResume() {
        const jobText = document.getElementById('job-text').value.trim();
        
        if (!jobText) {
            this.showError('Please enter a job description.', false);
            return;
        }

        if (!this.profile.name) {
            this.showError('Please complete your profile first.', false);
            return;
        }

        this.showLoading();
        this.showStatus('Generating resume...', 'loading');

        try {
            const requestData = {
                profile: this.profile,
                jobText: jobText,
                type: 'resume'
            };

            this.lastApiCall = {
                request: requestData,
                timestamp: new Date().toISOString()
            };

            const response = await fetch('http://localhost:8787/generateResume', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const result = await response.json();
            this.lastApiCall.response = result;

            // Display the resume
            this.displayResume(result.resumeContent);
            this.switchToResumeView();
            
            // Save data
            await this.saveData();

            this.showStatus('Resume generated successfully!', 'success');
            const downloadBtn = document.getElementById('download-resume-pdf');
            if (downloadBtn) downloadBtn.disabled = false;

        } catch (error) {
            console.error('Resume generation error:', error);
            this.showError(`Failed to generate resume: ${error.message}`);
            this.showStatus('Resume generation failed', 'error');
        } finally {
            this.hideLoading();
        }
    }

    displayResume(resumeContent) {
        // Switch to generate tab to ensure the preview element is visible
        this.switchTab('generate');
        
        // Wait a bit for tab switch to complete
        setTimeout(() => {
            const previewEl = document.querySelector('.resume-content');
            
            if (!previewEl) {
                console.error('Resume content element not found even after tab switch');
                return;
            }
            
            // Format the resume with proper structure
            const formattedResume = this.formatResume(resumeContent);
            previewEl.innerHTML = formattedResume;
        }, 100);
    }

    formatResume(resumeContent) {
        // Parse the JSON resume content
        let resume;
        try {
            resume = typeof resumeContent === 'string' ? JSON.parse(resumeContent) : resumeContent;
            console.log('Parsed resume data:', resume); // Debug log
        } catch (error) {
            console.error('Error parsing resume content:', error);
            return `<p style="color: red;">Error formatting resume content</p>`;
        }

        // Single-source rendering with exact measurements for pixel-perfect preview/PDF match
        const baseFont = "'Times New Roman', serif";
        const headerFontSize = "18pt";
        const contactFontSize = "11pt";
        const sectionHeaderSize = "11pt";
        const bodyFontSize = "10pt";
        const lineHeight = "1.25";
        const sectionSpacing = "0.8em";
        const entrySpacing = "0.6em";

        let formatted = `
            <div class="resume-page" style="
                font-family: ${baseFont};
                color: #000;
                line-height: ${lineHeight};
                max-width: 7.5in;
                margin: 0 auto;
                padding: 0.5in;
                background: white;
                min-height: 10in;
                box-sizing: border-box;
            ">
                <!-- Header Section -->
                <div class="resume-header" style="text-align: center; margin-bottom: ${sectionSpacing};">
                    <h1 style="
                        margin: 0 0 0.2em 0;
                        font-size: ${headerFontSize};
                        font-weight: bold;
                        letter-spacing: 0.5pt;
                    ">${this.profile.name}</h1>
                    <div style="
                        margin: 0;
                        font-size: ${contactFontSize};
                        line-height: 1.3;
                    ">${this.formatContactLine()}</div>
                    ${resume.summary ? `<div style="
                        margin: 0.3em 0 0 0;
                        font-size: ${contactFontSize};
                        font-weight: bold;
                    ">${resume.summary}</div>` : ''}
                </div>

                <!-- Skills Section -->
                ${resume.skills && resume.skills.length > 0 ? `
                <div class="resume-section" style="margin-bottom: ${sectionSpacing};">
                    <h2 style="
                        margin: 0 0 0.4em 0;
                        font-size: ${sectionHeaderSize};
                        font-weight: bold;
                        text-transform: uppercase;
                        border-bottom: 1pt solid #000;
                        padding-bottom: 2pt;
                    ">SKILLS & INTERESTS</h2>
                    <div style="font-size: ${bodyFontSize};">
                        ${this.formatSkillsComprehensive(resume.skills)}
                    </div>
                </div>` : ''}

                <!-- Education Section - ALWAYS SHOW -->
                <div class="resume-section" style="margin-bottom: ${sectionSpacing};">
                    <h2 style="
                        margin: 0 0 0.4em 0;
                        font-size: ${sectionHeaderSize};
                        font-weight: bold;
                        text-transform: uppercase;
                        border-bottom: 1pt solid #000;
                        padding-bottom: 2pt;
                    ">EDUCATION & HONORS</h2>
                    <div style="display: flex; justify-content: space-between; align-items: baseline;">
                        <span style="font-size: ${contactFontSize}; font-weight: bold;">
                            ${resume.education?.school || this.profile.education?.university || 'Texas State University'}${resume.education?.location ? ` – ${resume.education.location}` : ' – San Marcos, TX'}
                        </span>
                        <span style="font-size: ${contactFontSize};">
                            Graduation Date: ${resume.education?.dates || 'May 2026'}
                        </span>
                    </div>
                    <div style="font-size: ${contactFontSize}; font-style: italic; margin: 0.1em 0;">
                        ${resume.education?.degree || 'Bachelor of Science in Computer Science'}
                    </div>
                    <div style="font-size: ${contactFontSize}; font-weight: bold;">
                        Major: ${resume.education?.major || this.profile.education?.major || 'Computer Science'}
                    </div>
                    ${resume.education?.minor || 'Mathematics' ? `<div style="font-size: ${contactFontSize}; font-weight: bold;">Minor: ${resume.education?.minor || 'Mathematics'}</div>` : ''}
                    <div style="font-size: ${contactFontSize}; margin: 0.2em 0 0 0;">GPA: ${resume.education?.gpa || this.profile.education?.gpa || '3.6/4.0'}</div>
                    <div style="font-size: ${bodyFontSize}; margin: 0.3em 0 0 0;">
                        • 4x Dean's List, Texas State Achievement Scholarship Recipient<br>
                        • Relevant Coursework: Data Structures and Algorithms, Assembly Language, Computer Architecture, Object Oriented Programming [Java], Computer Graphics, Cyber Security, Computing Systems Fundamentals, Software Engineering
                    </div>
                </div>

                <!-- Experience Section -->
                ${resume.experience && resume.experience.length > 0 ? `
                <div class="resume-section" style="margin-bottom: ${sectionSpacing};">
                    <h2 style="
                        margin: 0 0 0.4em 0;
                        font-size: ${sectionHeaderSize};
                        font-weight: bold;
                        text-transform: uppercase;
                        border-bottom: 1pt solid #000;
                        padding-bottom: 2pt;
                    ">EXPERIENCE</h2>
                    ${resume.experience.map(exp => `
                        <div class="experience-entry" style="margin-bottom: ${entrySpacing};">
                            <div style="display: flex; justify-content: space-between; align-items: baseline;">
                                <span style="font-size: ${contactFontSize}; font-weight: bold;">
                                    ${exp.company}${exp.location ? ` – ${exp.location}` : ''}
                                </span>
                                <span style="font-size: ${contactFontSize};">
                                    ${exp.dates}
                                </span>
                            </div>
                            <div style="font-size: ${contactFontSize}; font-style: italic; margin: 0.1em 0 0.2em 0;">
                                ${exp.title}
                            </div>
                            <ul style="
                                margin: 0;
                                padding-left: 1.2em;
                                font-size: ${bodyFontSize};
                                line-height: ${lineHeight};
                            ">
                                ${exp.bullets.map(bullet => `<li style="margin-bottom: 0.1em;">${bullet}</li>`).join('')}
                            </ul>
                        </div>
                    `).join('')}
                </div>` : ''}

                <!-- Projects Section -->
                ${resume.projects && resume.projects.length > 0 ? `
                <div class="resume-section" style="margin-bottom: ${sectionSpacing};">
                    <h2 style="
                        margin: 0 0 0.4em 0;
                        font-size: ${sectionHeaderSize};
                        font-weight: bold;
                        text-transform: uppercase;
                        border-bottom: 1pt solid #000;
                        padding-bottom: 2pt;
                    ">PROJECTS</h2>
                    ${resume.projects.map(proj => `
                        <div class="project-entry" style="margin-bottom: ${entrySpacing};">
                            <div style="font-size: ${contactFontSize}; font-weight: bold; margin-bottom: 0.1em;">
                                ${proj.name}${proj.link ? ` | ${proj.link}` : ''}
                            </div>
                            <ul style="
                                margin: 0;
                                padding-left: 1.2em;
                                font-size: ${bodyFontSize};
                                line-height: ${lineHeight};
                            ">
                                ${proj.bullets.map(bullet => `<li style="margin-bottom: 0.1em;">${bullet}</li>`).join('')}
                            </ul>
                        </div>
                    `).join('')}
                </div>` : ''}

                <!-- Programs/Certifications Section - ALWAYS SHOW -->
                <div class="resume-section">
                    <h2 style="
                        margin: 0 0 0.4em 0;
                        font-size: ${sectionHeaderSize};
                        font-weight: bold;
                        text-transform: uppercase;
                        border-bottom: 1pt solid #000;
                        padding-bottom: 2pt;
                    ">PROGRAMS / CERTIFICATIONS</h2>
                    <div style="font-size: ${bodyFontSize}; margin-bottom: 0.3em; line-height: 1.3;">
                        <strong>Paycom - Technology Summer Engagement Program - Austin, Texas</strong> - Jun 2025<br>
                        • Selected participant in Paycom's multi day tech immersion. Completed workshops on secure documentation and compliance strategies during Paycom Tech Engagement Program.<br>
                        • Worked with a small student team to design and pitch a feature concept to Paycom engineers, gaining direct feedback on Agile teamwork, presentation skills, and real-world software workflows.
                    </div>
                </div>
            </div>
        `;

        return formatted;
    }

    formatContactLine() {
        const contactParts = [];
        
        // Add location first if available
        if (this.profile.location && this.profile.location.trim()) {
            contactParts.push(this.profile.location.trim());
        }
        
        // Parse contact information
        const lines = this.profile.contact.split('\n');
        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed && trimmed !== 'undefined' && trimmed !== 'null') {
                if (trimmed.includes('@')) {
                    contactParts.push(trimmed); // Email
                } else if (trimmed.match(/\d{3}.*\d{3}.*\d{4}/)) {
                    contactParts.push(trimmed); // Phone
                } else if (trimmed.includes('linkedin.com')) {
                    contactParts.push(trimmed.includes('http') ? 'LinkedIn' : trimmed);
                } else if (trimmed.includes('github.com')) {
                    contactParts.push(trimmed.includes('http') ? 'GitHub' : trimmed);
                } else if (trimmed.length > 0) {
                    contactParts.push(trimmed);
                }
            }
        });
        
        // Filter out any empty or invalid parts
        const validParts = contactParts.filter(part => 
            part && part.trim() && part !== 'undefined' && part !== 'null'
        );
        
        return validParts.join(' | ');
    }

    formatSkillsComprehensive(skills) {
        // Format skills as comprehensive grouped lines like the sample
        if (Array.isArray(skills) && skills.length > 0 && typeof skills[0] === 'string' && skills[0].includes(':')) {
            // Skills already come grouped from API
            return skills.map(skillLine => 
                `<p style="margin: 0 0 0.2em 0; line-height: 1.3;"><strong>${skillLine.split(':')[0]}:</strong> ${skillLine.split(':')[1]}</p>`
            ).join('');
        } else {
            // Fallback: group skills manually
            return `<p style="margin: 0; line-height: 1.3;"><strong>Technical Skills:</strong> ${skills.join(', ')}</p>`;
        }
    }

    switchToResumeView() {
        this.currentView = 'resume';
        
        // Hide cover letter elements
        const coverLetterPreview = document.getElementById('cover-letter-preview');
        const downloadCoverLetterBtn = document.getElementById('download-pdf');
        
        if (coverLetterPreview) coverLetterPreview.classList.add('hidden');
        if (downloadCoverLetterBtn) downloadCoverLetterBtn.classList.add('hidden');
        
        // Show resume elements
        const resumePreview = document.getElementById('resume-preview');
        const downloadResumeBtn = document.getElementById('download-resume-pdf');
        const previewTitle = document.getElementById('preview-title');
        
        if (resumePreview) resumePreview.classList.remove('hidden');
        if (downloadResumeBtn) downloadResumeBtn.classList.remove('hidden');
        if (previewTitle) previewTitle.textContent = 'Resume Preview';
    }

    switchToCoverLetterView() {
        this.currentView = 'cover-letter';
        
        // Show cover letter elements
        const coverLetterPreview = document.getElementById('cover-letter-preview');
        const downloadCoverLetterBtn = document.getElementById('download-pdf');
        
        if (coverLetterPreview) coverLetterPreview.classList.remove('hidden');
        if (downloadCoverLetterBtn) downloadCoverLetterBtn.classList.remove('hidden');
        
        // Hide resume elements
        const resumePreview = document.getElementById('resume-preview');
        const downloadResumeBtn = document.getElementById('download-resume-pdf');
        const previewTitle = document.getElementById('preview-title');
        
        if (resumePreview) resumePreview.classList.add('hidden');
        if (downloadResumeBtn) downloadResumeBtn.classList.add('hidden');
        if (previewTitle) previewTitle.textContent = 'Cover Letter Preview';
    }

    async downloadResumePDF() {
        try {
            // Show loading
            this.showStatus('Generating PDF...', 'loading');
            
            // Get the resume content
            const resumeElement = document.querySelector('.resume-content');
            if (!resumeElement) {
                throw new Error('No resume to download');
            }

            // Create PDF using jsPDF with exact measurements
            const { jsPDF } = window.jspdf;
            if (!jsPDF) {
                throw new Error('PDF library not loaded');
            }

            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: 'letter'
            });

            // Convert HTML to PDF with exact preview matching
            await this.renderHTMLToPDF(doc, resumeElement);

            // Generate filename with proper format
            const company = this.extractCompanyFromJob();
            const role = this.extractRoleFromJob();
            const nameParts = this.profile.name.split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ');
            const filename = `${firstName} ${lastName} Resume${company ? ' ' + company : ''}${role ? ' ' + role : ''}.pdf`;

            // Convert to blob and download - identical to cover letter
            const pdfBlob = doc.output('blob');
            const url = URL.createObjectURL(pdfBlob);
            
            // Use Chrome downloads API for instant download
            if (chrome && chrome.downloads) {
                chrome.downloads.download({
                    url: url,
                    filename: filename,
                    saveAs: false
                }, (downloadId) => {
                    if (chrome.runtime.lastError) {
                        console.error('Download failed:', chrome.runtime.lastError);
                        this.fallbackDownload(url, filename);
                    } else {
                        this.showStatus('Resume PDF downloaded successfully!', 'success');
                        setTimeout(() => {
                            const statusEl = document.getElementById('generation-status');
                            if (statusEl) statusEl.textContent = '';
                        }, 3000);
                    }
                    
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                });
            } else {
                this.fallbackDownload(url, filename);
            }

        } catch (error) {
            console.error('Resume PDF generation error:', error);
            this.showError(`Failed to generate resume PDF: ${error.message}`);
            this.showStatus('PDF generation failed', 'error');
        }
    }

    async renderHTMLToPDF(doc, element) {
        // Professional resume PDF rendering with exact preview matching
        const leftMargin = 36; // 0.5 inch in points
        const rightMargin = 36;
        const topMargin = 54;
        const pageWidth = 612; // Letter size width in points
        const pageHeight = 792; // Letter size height in points
        const textWidth = pageWidth - leftMargin - rightMargin;
        
        let currentY = topMargin;
        
        // Extract and render each section
        const header = element.querySelector('.resume-header');
        if (header) {
            currentY = await this.renderSection(doc, header, currentY, leftMargin, textWidth);
        }
        
        const sections = element.querySelectorAll('.resume-section');
        for (const section of sections) {
            currentY = await this.renderSection(doc, section, currentY, leftMargin, textWidth);
        }
    }

    async renderSection(doc, section, startY, leftMargin, textWidth) {
        let currentY = startY;
        
        // Handle headers
        const h1 = section.querySelector('h1');
        const h2 = section.querySelector('h2');
        const h3Elements = section.querySelectorAll('h3');
        
        if (h1) {
            doc.setFont('times', 'bold');
            doc.setFontSize(18);
            const text = h1.textContent.trim();
            doc.text(text, leftMargin + (textWidth - doc.getTextWidth(text)) / 2, currentY);
            currentY += 20;
        }
        
        if (h2) {
            doc.setFont('times', 'bold');
            doc.setFontSize(11);
            const text = h2.textContent.trim();
            doc.text(text, leftMargin, currentY);
            doc.line(leftMargin, currentY + 3, leftMargin + textWidth, currentY + 3);
            currentY += 18;
        }
        
        // Handle paragraphs
        const paragraphs = section.querySelectorAll('p');
        paragraphs.forEach(p => {
            if (!p.closest('div[style*="flex"]')) { // Skip paragraphs inside flex containers
                doc.setFont('times', 'normal');
                doc.setFontSize(10);
                const text = p.textContent.trim();
                if (text) {
                    const lines = doc.splitTextToSize(text, textWidth);
                    lines.forEach(line => {
                        doc.text(line, leftMargin, currentY);
                        currentY += 12;
                    });
                }
            }
        });
        
        // Handle experience/project entries
        const entries = section.querySelectorAll('.experience-entry, .project-entry');
        entries.forEach(entry => {
            const titleLine = entry.querySelector('div[style*="flex"]');
            if (titleLine) {
                const title = titleLine.querySelector('span:first-child');
                const date = titleLine.querySelector('span:last-child');
                
                if (title) {
                    doc.setFont('times', 'bold');
                    doc.setFontSize(11);
                    doc.text(title.textContent.trim(), leftMargin, currentY);
                }
                
                if (date) {
                    doc.setFont('times', 'normal');
                    doc.setFontSize(11);
                    const dateText = date.textContent.trim();
                    const dateWidth = doc.getTextWidth(dateText);
                    doc.text(dateText, leftMargin + textWidth - dateWidth, currentY);
                }
                
                currentY += 14;
            }
            
            // Handle role/project title
            const roleTitle = entry.querySelector('div[style*="italic"]');
            if (roleTitle) {
                doc.setFont('times', 'italic');
                doc.setFontSize(11);
                doc.text(roleTitle.textContent.trim(), leftMargin, currentY);
                currentY += 12;
            }
            
            // Handle project name (non-italic)
            const projectTitle = entry.querySelector('div[style*="font-weight: bold"]:not([style*="italic"])');
            if (projectTitle && !roleTitle) {
                doc.setFont('times', 'bold');
                doc.setFontSize(11);
                doc.text(projectTitle.textContent.trim(), leftMargin, currentY);
                currentY += 12;
            }
            
            // Handle bullets
            const bullets = entry.querySelectorAll('li');
            bullets.forEach(bullet => {
                doc.setFont('times', 'normal');
                doc.setFontSize(10);
                const bulletText = `• ${bullet.textContent.trim()}`;
                const lines = doc.splitTextToSize(bulletText, textWidth - 20);
                lines.forEach((line, lineIndex) => {
                    doc.text(line, leftMargin + (lineIndex === 0 ? 0 : 20), currentY);
                    currentY += 12;
                });
            });
            
            currentY += 8; // Space between entries
        });
        
        currentY += 10; // Space between sections
        return currentY;
    }


    extractCompanyFromJob() {
        const jobText = document.getElementById('job-text')?.value || '';
        const companyMatch = jobText.match(/(?:company|organization|at|join)\s*:?\s*([A-Z][a-zA-Z\s&.,]+?)(?:\s|$|,|\.|!)/i) ||
                            jobText.match(/([A-Z][a-zA-Z\s&.,]{2,30})(?:\s+is\s+(?:seeking|looking|hiring))/i);
        return companyMatch ? companyMatch[1].trim().replace(/[.,!]$/, '') : '';
    }

    extractRoleFromJob() {
        const jobText = document.getElementById('job-text')?.value || '';
        const roleMatch = jobText.match(/(?:position|role|job title|title|hiring)\s*:?\s*([A-Z][a-zA-Z\s-]+?)(?:\s|$|,|\.|!|at)/i) ||
                         jobText.match(/(?:seeking|looking for|hiring)\s+(?:a|an)?\s*([A-Z][a-zA-Z\s-]+?)(?:\s+to|\s+who|$)/i);
        return roleMatch ? roleMatch[1].trim().replace(/[.,!-]$/, '') : '';
    }


    // Debug functionality
    saveLogs() {
        if (!this.lastApiCall) {
            this.showError('No recent API call to save logs for.', false);
            return;
        }

        const logs = {
            timestamp: this.lastApiCall.timestamp,
            request: this.lastApiCall.request,
            response: this.lastApiCall.response || 'No response received'
        };

        const dataStr = JSON.stringify(logs, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `cover-letter-logs-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
    }
}

// Initialize the app when DOM is loaded
function initApp() {
    try {
        new CoverLetterApp();
    } catch (error) {
        console.error('Failed to initialize Cover Letter App:', error);
        // Retry after a short delay
        setTimeout(initApp, 1000);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    // DOM is already loaded
    initApp();
}
