(()=>{'use strict';const $=id=>document.getElementById(id);let goals=[],filter='all';const esc=s=>String(s||'').replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));const visible=()=>goals.filter(g=>filter==='all'||(filter==='completed'?!!g.completed:!g.completed));
function render(){const active=goals.filter(g=>!g.completed),completed=goals.filter(g=>g.completed),overall=goals.length?Math.round(goals.reduce((a,g)=>a+Number(g.progress||0),0)/goals.length):0;$('goal-stats').innerHTML=`<article><span>⚑</span><strong>${active.length}</strong><small>Active Goals</small><em>${completed.length} completed</em></article><article><span>◔</span><strong>${overall}%</strong><small>Overall Progress</small><em>Keep building momentum</em></article><article><span>🔥</span><strong>${active.length?Math.max(1,active.length*3):0}</strong><small>Day Streak</small><em>Consistency matters</em></article><article><span>☑</span><strong>${completed.length}/${goals.length||0}</strong><small>Goals Completed</small><em>Across all goals</em></article>`;const list=$('goal-list');list.innerHTML='';const items=visible();if(!items.length)list.innerHTML='<div class="panel-placeholder">No goals in this view yet.</div>';items.forEach((g,i)=>{const p=Math.max(0,Math.min(100,Number(g.progress||0)));const card=document.createElement('article');card.className='reference-goal-card';card.innerHTML=`<div class="goal-card-icon">${['▣','⌁','▤','◎'][i%4]}</div><div class="goal-card-copy"><div><h3>${esc(g.title||'Untitled goal')}</h3><span class="goal-tag">${g.completed?'Completed':'Active'}</span></div><p>${g.completed?'This goal is complete.':'Keep moving this goal forward with one clear next step.'}</p><div class="goal-card-meta"><span>Progress: ${p}%</span><span>${g.completed?'Completed':'In progress'}</span></div></div><div class="goal-card-progress"><div class="progress-track"><i style="width:${p}%"></i></div><strong>${p}%</strong><label>Progress <input class="goal-range" type="range" min="0" max="100" value="${p}"></label></div><div class="goal-card-actions"><button class="goal-complete" type="button">${g.completed?'Reopen':'Complete'}</button><button class="goal-delete" type="button">Delete</button></div>`;card.querySelector('.goal-range').onchange=e=>update(g.id,{progress:Number(e.target.value),completed:Number(e.target.value)>=100});card.querySelector('.goal-complete').onclick=()=>update(g.id,{completed:!g.completed,progress:g.completed?Math.min(99,p||0):100});card.querySelector('.goal-delete').onclick=()=>{if(confirm(`Delete “${g.title}”?`))del(g.id)};list.appendChild(card)});$('goal-progress-number').textContent=overall+'%';$('goal-progress-breakdown').innerHTML=`<div>● Completed <strong>${completed.length}</strong></div><div>● In Progress <strong>${active.length}</strong></div>`;$('goal-insight-text').textContent=goals.length?`${overall>=60?'You are making solid progress.':'Your progress is building.'} Focus on completing one meaningful goal before spreading attention too widely.`:'Create your first goal and progress insights will appear here.';$('goal-suggested-focus').innerHTML=(active.slice(0,3).map(g=>`<li>${esc(g.title)}</li>`).join('')||'<li>Choose one meaningful next step.</li>')}
async function load(){try{const d=await window.api('/api/goals');goals=Array.isArray(d)?d:(d.goals||[]);render()}catch(e){console.error(e);$('goal-list').textContent='Unable to load goals.'}}async function update(id,payload){try{await window.api('/api/goals/'+encodeURIComponent(id),{method:'PUT',body:JSON.stringify(payload)});await load()}catch(e){alert(e.message)}}async function del(id){try{await window.api('/api/goals/'+encodeURIComponent(id),{method:'DELETE'});await load()}catch(e){alert(e.message)}}function openModal(){const m=$('goal-modal');m.hidden=false;m.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';setTimeout(()=>$('goal-title').focus(),50)}function closeModal(){const m=$('goal-modal');m.hidden=true;m.setAttribute('aria-hidden','true');document.body.style.overflow=''}$('goal-form').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget;const b=form.querySelector('[type=submit]');b.disabled=true;try{await window.api('/api/goals',{method:'POST',body:JSON.stringify({title:$('goal-title').value.trim()})});form.reset();closeModal();await load()}catch(err){alert(err.message)}finally{b.disabled=false}});['goal-new-button','quick-goal-new'].forEach(id=>$(id).onclick=openModal);$('goal-form-cancel').onclick=closeModal;document.querySelectorAll('[data-goal-modal-close]').forEach(x=>x.onclick=closeModal);document.querySelectorAll('[data-goal-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.goalFilter;document.querySelectorAll('[data-goal-filter]').forEach(x=>x.classList.toggle('active',x===b));render()});$('quick-goal-review').onclick=()=>document.querySelector('[data-goal-filter="active"]')?.click();function openGoalRoadmap() {
    let modal = document.getElementById("goal-roadmap-modal");

    if (!modal) {
        modal = document.createElement("div");
        modal.id = "goal-roadmap-modal";

        modal.innerHTML = `
            <div class="goal-roadmap-backdrop"></div>

            <div class="goal-roadmap-dialog"
                 role="dialog"
                 aria-modal="true"
                 aria-labelledby="goal-roadmap-title">

                <div class="goal-roadmap-header">

                    <div>
                        <span class="goal-roadmap-eyebrow">
                            YOUR PROGRESS
                        </span>

                        <h2 id="goal-roadmap-title">
                            Goal Roadmap
                        </h2>

                        <p>
                            See where you are and what to focus on next.
                        </p>
                    </div>

                    <button
                        type="button"
                        class="goal-roadmap-close"
                        aria-label="Close roadmap">
                        ×
                    </button>

                </div>

                <div
                    id="goal-roadmap-content"
                    class="goal-roadmap-content">
                </div>

            </div>
        `;

        document.body.appendChild(modal);

        const style = document.createElement("style");

        style.textContent = `
            #goal-roadmap-modal {
                position: fixed;
                inset: 0;
                z-index: 9999;
                display: none;
                align-items: center;
                justify-content: center;
                padding: 24px;
            }

            #goal-roadmap-modal.is-open {
                display: flex;
            }

            .goal-roadmap-backdrop {
                position: absolute;
                inset: 0;
                background: rgba(15, 23, 42, 0.58);
                backdrop-filter: blur(6px);
            }

            .goal-roadmap-dialog {
                position: relative;
                z-index: 1;
                width: min(760px, 100%);
                max-height: min(82vh, 760px);
                overflow: hidden;
                border-radius: 24px;
                background: #ffffff;
                box-shadow:
                    0 24px 80px rgba(15, 23, 42, 0.28);
                display: flex;
                flex-direction: column;
            }

            .goal-roadmap-header {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 20px;
                padding: 28px 30px 22px;
                border-bottom: 1px solid #e8eaf2;
            }

            .goal-roadmap-eyebrow {
                display: block;
                margin-bottom: 8px;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.14em;
                color: #6d5bd0;
            }

            .goal-roadmap-header h2 {
                margin: 0;
                font-size: 28px;
                color: #202b3d;
            }

            .goal-roadmap-header p {
                margin: 8px 0 0;
                color: #667085;
            }

            .goal-roadmap-close {
                width: 42px;
                height: 42px;
                border: 0;
                border-radius: 12px;
                background: #f4f5f8;
                color: #344054;
                font-size: 28px;
                line-height: 1;
                cursor: pointer;
            }

            .goal-roadmap-content {
                overflow-y: auto;
                padding: 24px 30px 30px;
            }

            .goal-roadmap-summary {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 14px;
                margin-bottom: 26px;
            }

            .goal-roadmap-stat {
                padding: 18px;
                border: 1px solid #e7e8ef;
                border-radius: 16px;
                background: #fafbff;
            }

            .goal-roadmap-stat span {
                display: block;
                font-size: 12px;
                color: #667085;
                margin-bottom: 7px;
            }

            .goal-roadmap-stat strong {
                font-size: 25px;
                color: #252f42;
            }

            .goal-roadmap-list {
                position: relative;
                display: grid;
                gap: 16px;
            }

            .goal-roadmap-item {
                position: relative;
                display: grid;
                grid-template-columns: 48px 1fr auto;
                gap: 16px;
                align-items: center;
                padding: 18px;
                border: 1px solid #e7e8ef;
                border-radius: 18px;
                background: #ffffff;
            }

            .goal-roadmap-step {
                width: 42px;
                height: 42px;
                display: grid;
                place-items: center;
                border-radius: 50%;
                background: #f0edff;
                color: #5b45c6;
                font-weight: 700;
            }

            .goal-roadmap-main strong {
                display: block;
                margin-bottom: 7px;
                color: #202b3d;
                font-size: 16px;
            }

            .goal-roadmap-main p {
                margin: 0;
                color: #667085;
                font-size: 13px;
            }

            .goal-roadmap-progress {
                min-width: 100px;
                text-align: right;
            }

            .goal-roadmap-progress strong {
                display: block;
                margin-bottom: 8px;
                color: #3d2f91;
            }

            .goal-roadmap-bar {
                width: 100px;
                height: 7px;
                overflow: hidden;
                border-radius: 999px;
                background: #e9e7f4;
            }

            .goal-roadmap-bar span {
                display: block;
                height: 100%;
                border-radius: inherit;
                background: linear-gradient(
                    90deg,
                    #5b45c6,
                    #7b68ee
                );
            }

            .goal-roadmap-empty {
                padding: 42px 20px;
                text-align: center;
                color: #667085;
            }

            @media (max-width: 640px) {
                #goal-roadmap-modal {
                    padding: 12px;
                    align-items: flex-end;
                }

                .goal-roadmap-dialog {
                    max-height: 88vh;
                    border-radius: 22px 22px 16px 16px;
                }

                .goal-roadmap-header,
                .goal-roadmap-content {
                    padding-left: 20px;
                    padding-right: 20px;
                }

                .goal-roadmap-summary {
                    grid-template-columns: 1fr;
                }

                .goal-roadmap-item {
                    grid-template-columns: 42px 1fr;
                }

                .goal-roadmap-progress {
                    grid-column: 2;
                    text-align: left;
                }

                .goal-roadmap-bar {
                    width: 100%;
                }
            }
        `;

        document.head.appendChild(style);

        const close = () => {
            modal.classList.remove("is-open");
            document.body.style.overflow = "";
        };

        modal.querySelector(".goal-roadmap-close")
            .addEventListener("click", close);

        modal.querySelector(".goal-roadmap-backdrop")
            .addEventListener("click", close);

        document.addEventListener("keydown", event => {
            if (
                event.key === "Escape" &&
                modal.classList.contains("is-open")
            ) {
                close();
            }
        });
    }

    const content =
        modal.querySelector("#goal-roadmap-content");

    const roadmapGoals =
        [...goals]
            .sort(
                (a, b) =>
                    Number(b.progress || 0) -
                    Number(a.progress || 0)
            );

    const completed =
        roadmapGoals.filter(
            goal =>
                goal.completed ||
                Number(goal.progress || 0) >= 100
        );

    const active =
        roadmapGoals.filter(
            goal =>
                !goal.completed &&
                Number(goal.progress || 0) < 100
        );

    if (!roadmapGoals.length) {
        content.innerHTML = `
            <div class="goal-roadmap-empty">
                <strong>No goals in your roadmap yet.</strong>
                <p>Create your first goal and it will appear here.</p>
            </div>
        `;
    } else {
        content.innerHTML = `
            <div class="goal-roadmap-summary">

                <div class="goal-roadmap-stat">
                    <span>Total Goals</span>
                    <strong>${roadmapGoals.length}</strong>
                </div>

                <div class="goal-roadmap-stat">
                    <span>Completed</span>
                    <strong>${completed.length}</strong>
                </div>

                <div class="goal-roadmap-stat">
                    <span>In Progress</span>
                    <strong>${active.length}</strong>
                </div>

            </div>

            <div class="goal-roadmap-list">

                ${roadmapGoals.map(
                    (goal, index) => {

                        const progress =
                            Math.max(
                                0,
                                Math.min(
                                    100,
                                    Number(
                                        goal.progress || 0
                                    )
                                )
                            );

                        const done =
                            goal.completed ||
                            progress >= 100;

                        return `
                            <article
                                class="goal-roadmap-item">

                                <div
                                    class="goal-roadmap-step">
                                    ${index + 1}
                                </div>

                                <div
                                    class="goal-roadmap-main">

                                    <strong>
                                        ${esc(goal.title)}
                                    </strong>

                                    <p>
                                        ${
                                            done
                                                ? "Completed successfully"
                                                : progress === 0
                                                    ? "Ready to begin"
                                                    : "Keep moving toward completion"
                                        }
                                    </p>

                                </div>

                                <div
                                    class="goal-roadmap-progress">

                                    <strong>
                                        ${progress}%
                                    </strong>

                                    <div
                                        class="goal-roadmap-bar">

                                        <span
                                            style="
                                                width:
                                                ${progress}%;
                                            ">
                                        </span>

                                    </div>

                                </div>

                            </article>
                        `;
                    }
                ).join("")}

            </div>
        `;
    }

    modal.classList.add("is-open");
    document.body.style.overflow = "hidden";
}

$('quick-goal-roadmap').onclick =
    openGoalRoadmap;window.loadGoals=load;if(typeof window.api==='function')load();else addEventListener('api-ready',load,{once:true});})();
