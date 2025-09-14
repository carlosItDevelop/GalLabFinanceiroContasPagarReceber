/**
 * Módulo de Agenda
 * Gerencia eventos, compromissos e calendario FullCalendar
 */

import { ErrorHandler } from '../utils/error-handler.js';
import { LoadingManager } from '../utils/loading-manager.js';

class AgendaModule {
    constructor() {
        this.calendar = null;
        this.events = [];
        this.loadingManager = new LoadingManager();
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeCalendar();
        this.loadEvents();
    }

    setupEventListeners() {
        // Botão Novo Evento (quando implementado no HTML)
        const btnNovoEvento = document.getElementById('novo-evento');
        if (btnNovoEvento) {
            btnNovoEvento.addEventListener('click', () => this.openEventModal());
        }

        // Setup drag and drop das predefinições (quando implementado)
        this.setupPredefinitions();
    }

    initializeCalendar() {
        const calendarEl = document.getElementById('calendar-container') || document.getElementById('agenda-calendar');
        
        if (!calendarEl) {
            console.warn('Elemento do calendário não encontrado. Criando estrutura...');
            this.createCalendarStructure();
            return;
        }

        // Verificar se FullCalendar está disponível
        if (typeof FullCalendar === 'undefined') {
            console.error('FullCalendar não está carregado');
            ErrorHandler.showError('Erro', 'Biblioteca do calendário não encontrada');
            return;
        }

        this.calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            locale: 'pt-br',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
            },
            height: 'auto',
            events: this.events,
            selectable: true,
            selectMirror: true,
            dayMaxEvents: true,
            weekends: true,
            
            // Event handlers
            select: (info) => {
                this.handleDateSelect(info);
            },
            
            eventClick: (info) => {
                this.handleEventClick(info);
            },
            
            eventDrop: (info) => {
                this.handleEventDrop(info);
            },
            
            eventResize: (info) => {
                this.handleEventResize(info);
            }
        });

        this.calendar.render();
        console.log('Calendário FullCalendar inicializado com sucesso');
    }

    createCalendarStructure() {
        // Verificar se estamos na aba agenda
        const agendaPanel = document.getElementById('agenda');
        if (!agendaPanel) {
            console.log('Aba agenda ainda não foi carregada');
            return;
        }

        // Criar estrutura básica do calendário se não existir
        const existingCalendar = agendaPanel.querySelector('#calendar-container');
        if (existingCalendar) return;

        const calendarHTML = `
            <div class="agenda-container">
                <div class="agenda-header">
                    <h3>📅 Calendário de Eventos</h3>
                    <div class="agenda-actions">
                        <button id="novo-evento" class="btn btn-primary">+ Novo Evento</button>
                        <button id="sync-eventos" class="btn btn-outline-primary">🔄 Sincronizar</button>
                    </div>
                </div>
                
                <div class="agenda-sidebar">
                    <div class="predefinitions">
                        <h4>🎯 Eventos Pré-definidos</h4>
                        <div class="predefinition-list">
                            <div class="predefinition-item" draggable="true" data-event-type="pagamento">
                                💸 Pagamento de Conta
                            </div>
                            <div class="predefinition-item" draggable="true" data-event-type="recebimento">
                                💰 Recebimento
                            </div>
                            <div class="predefinition-item" draggable="true" data-event-type="reuniao">
                                🤝 Reunião
                            </div>
                            <div class="predefinition-item" draggable="true" data-event-type="follow-up">
                                📞 Follow-up Cliente
                            </div>
                            <div class="predefinition-item" draggable="true" data-event-type="vencimento">
                                ⏰ Vencimento
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="agenda-main">
                    <div id="calendar-container"></div>
                </div>
            </div>
        `;

        agendaPanel.innerHTML = calendarHTML;
        
        // Reinicializar após criar estrutura
        setTimeout(() => {
            this.init();
        }, 100);
    }

    setupPredefinitions() {
        const predefinitions = document.querySelectorAll('.predefinition-item');
        
        predefinitions.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', item.getAttribute('data-event-type'));
                e.dataTransfer.effectAllowed = 'copy';
            });
        });

        // TODO: Implementar drop na área do calendário
        const calendarEl = document.getElementById('calendar-container');
        if (calendarEl) {
            calendarEl.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
            });

            calendarEl.addEventListener('drop', (e) => {
                e.preventDefault();
                const eventType = e.dataTransfer.getData('text/plain');
                this.handlePredefinitionDrop(eventType, e);
            });
        }
    }

    handleDateSelect(info) {
        const eventData = {
            start: info.start,
            end: info.end,
            allDay: info.allDay
        };
        
        this.openEventModal(eventData);
    }

    handleEventClick(info) {
        const event = info.event;
        this.showEventDetails(event);
    }

    handleEventDrop(info) {
        this.updateEvent(info.event);
        ErrorHandler.showSuccess('Evento movido', 'Evento reagendado com sucesso');
    }

    handleEventResize(info) {
        this.updateEvent(info.event);
        ErrorHandler.showSuccess('Evento redimensionado', 'Duração do evento atualizada');
    }

    handlePredefinitionDrop(eventType, dropEvent) {
        console.log(`Predefinição arrastada: ${eventType}`);
        
        // Calcular data aproximada baseada na posição do drop
        const today = new Date();
        const eventData = {
            start: today,
            title: this.getPredefinitionTitle(eventType),
            type: eventType,
            allDay: false
        };
        
        this.openEventModal(eventData);
    }

    getPredefinitionTitle(eventType) {
        const titles = {
            'pagamento': 'Pagamento de Conta',
            'recebimento': 'Recebimento',
            'reuniao': 'Reunião',
            'follow-up': 'Follow-up Cliente',
            'vencimento': 'Vencimento'
        };
        
        return titles[eventType] || 'Novo Evento';
    }

    async loadEvents() {
        try {
            // Tentar carregar eventos do servidor
            const response = await fetch('/api/agenda/eventos');
            
            if (response.ok) {
                this.events = await response.json();
            } else {
                // Usar eventos mock para demonstração
                this.events = this.generateMockEvents();
            }
            
            if (this.calendar) {
                this.calendar.removeAllEvents();
                this.calendar.addEventSource(this.events);
            }
            
        } catch (error) {
            console.log('API de agenda não disponível, usando eventos mock');
            this.events = this.generateMockEvents();
            
            if (this.calendar) {
                this.calendar.removeAllEvents();
                this.calendar.addEventSource(this.events);
            }
        }
    }

    generateMockEvents() {
        const today = new Date();
        const events = [];
        
        // Adicionar alguns eventos de exemplo
        for (let i = 0; i < 10; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + Math.floor(Math.random() * 30) - 15);
            
            events.push({
                id: `mock-${i}`,
                title: `Evento ${i + 1}`,
                start: date.toISOString().split('T')[0],
                color: this.getRandomColor(),
                type: 'mock'
            });
        }
        
        return events;
    }

    getRandomColor() {
        const colors = ['#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8', '#6f42c1'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    openEventModal(eventData = {}) {
        // TODO: Implementar modal de criação/edição de eventos
        console.log('Abrindo modal de evento:', eventData);
        ErrorHandler.showInfo('Novo Evento', 'Modal de criação de eventos será implementado em breve');
    }

    showEventDetails(event) {
        // TODO: Implementar visualização detalhada do evento
        console.log('Mostrando detalhes do evento:', event);
        ErrorHandler.showInfo('Detalhes', `Evento: ${event.title}`);
    }

    async updateEvent(event) {
        try {
            // TODO: Implementar atualização no servidor
            console.log('Atualizando evento:', event);
            
        } catch (error) {
            console.error('Erro ao atualizar evento:', error);
            ErrorHandler.showError('Erro', 'Erro ao atualizar evento');
        }
    }

    async createEvent(eventData) {
        try {
            // TODO: Implementar criação no servidor
            console.log('Criando evento:', eventData);
            
            if (this.calendar) {
                this.calendar.addEvent(eventData);
            }
            
            ErrorHandler.showSuccess('Evento criado', 'Evento adicionado ao calendário');
            
        } catch (error) {
            console.error('Erro ao criar evento:', error);
            ErrorHandler.showError('Erro', 'Erro ao criar evento');
        }
    }

    async deleteEvent(eventId) {
        try {
            // TODO: Implementar exclusão no servidor
            console.log('Excluindo evento:', eventId);
            
            if (this.calendar) {
                const event = this.calendar.getEventById(eventId);
                if (event) {
                    event.remove();
                }
            }
            
            ErrorHandler.showSuccess('Evento excluído', 'Evento removido do calendário');
            
        } catch (error) {
            console.error('Erro ao excluir evento:', error);
            ErrorHandler.showError('Erro', 'Erro ao excluir evento');
        }
    }

    // Método público para ser chamado pelo TabManager
    async load() {
        if (!this.calendar) {
            this.initializeCalendar();
        }
        await this.loadEvents();
    }

    // Método público para sincronizar eventos
    async syncEvents() {
        this.loadingManager.show('sync-eventos', 'Sincronizando eventos...');
        
        try {
            await this.loadEvents();
            ErrorHandler.showSuccess('Sincronização concluída', 'Eventos sincronizados com sucesso');
        } catch (error) {
            ErrorHandler.showError('Erro na sincronização', error.message);
        } finally {
            this.loadingManager.hide('sync-eventos');
        }
    }
}

export { AgendaModule };