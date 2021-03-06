import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GuildService } from '../../../services/api/guild.service';
import { LogService } from '../../../services/log.service';
import { PingService } from '../../../services/ping.service';
import { PermissionsService } from '../../../services/perms.service';
import { SoundService } from '../../../services/sound.service';
import { UserService } from '../../../services/api/user.service';
import { WSService } from '../../../services/ws.service';
import { MessageService } from '../../../services/api/message.service';
import { ChannelService } from '../../../services/api/channel.service';
import { Lean } from '../../../types/entity-types';
import { commonPatterns } from '../../../utils/utils';

@Component({ template: '' })
export class TextBasedChannel implements OnInit {
  public channel: Lean.Channel;
  public guild: Lean.Guild;
  private messageBatchSize = 25;
  
  @ViewChild('message')
  private messageInput: ElementRef;
  
  public chatBox = new FormControl();
  public emojiPickerOpen = false;
  public ready = false;
  private lastTypedAt = null;

  public get messages(): Lean.Message[] {
    if (!this.channel) return [];

    return this.messageService.getAllCached(this.channel.id);
  }
  public get typingUsernames() {
    return this.channelService
      .getTyping(this.channel.id)
      .map(id => this.userService.getCached(id).username);
  }

  public get loadedAllMessages() {
    return !this.channel.lastMessageId
      || this.messages.length % this.messageBatchSize !== 0;
  }
  public get recipient() {
    return this.channelService.getRecipient(this.channel.id);
  }
  public get title() {
    return (this.channel.type === 'DM')
      ? `@me + @${this.recipient.username}`
      : `${this.guild.name} > #${this.channel.name}`;
  }

  constructor(
    protected route: ActivatedRoute,
    protected channelService: ChannelService,
    protected messageService: MessageService,
    public guildService: GuildService,
    protected log: LogService,
    protected router: Router,
    public perms: PermissionsService,
    public pings: PingService,
    public sounds: SoundService,
    public userService: UserService,
    protected ws: WSService,
  ) {}

  public async ngOnInit() {
    this.route.paramMap.subscribe(async (paramMap) => {
      const guildId = paramMap.get('guildId');
      const channelId = paramMap.get('channelId');

      this.guild = this.guildService.getCached(guildId);
      this.channel = this.channelService.getCached(channelId);

      await this.init();
    });
  }

  private async init() {
    if (this.channel.type === 'VOICE')
      return this.router.navigate(['..']);

    document.title = this.title;

    this.pings.markAsRead(this.channel.id);
    await this.loadMoreMessages();

    this.ws.on('MESSAGE_CREATE', () => this.scrollToMessage(50), this);
    
    this.ready = true;
  }

  private scrollToMessage(timeout = 100, scrollTop?: number) {
    setTimeout(() => {
      try {
        const messages = document.querySelector('.messages');
        const height = messages.scrollHeight;
        messages.scrollTop = scrollTop ?? height;        
      } catch {}
    }, timeout);
  }

  public async chat(content: string) {
    if (!content.trim()) return;
    
    content = content.replace(commonPatterns.trailingNewLines, '');
    this.messageInput.nativeElement.value = '';

    this.ws.emit('MESSAGE_CREATE', {
      channelId: this.channel.id,
      partialMessage: { content },
    }, this);
    await this.sounds.message();

    this.channelService.stopTyping(this.channel.id, this.userService.self.id);
  }

  public async loadMoreMessages() {
    if (this.loadedAllMessages) return;

    const back = this.messages.length + this.messageBatchSize;
    await this.messageService
      .overrideFetchAll(this.channel.id, back);
      
    const scrollTop = (back > this.messageBatchSize) ? 0 : null;
    this.scrollToMessage(100, scrollTop);
  }
  
  public shouldCombine(index: number) {
    const lastIndex = Math.max(0, index - 1);
    const lastMessage = (index) ? this.messages[lastIndex] : null;
    if (!lastMessage) return false;

    const message = this.messages[index];
    const msDifference = new Date(message.createdAt).getTime() - new Date(lastMessage?.createdAt).getTime();    
    const minsAgo = msDifference / 60 / 1000;    

    const maxTimeDifference = 5;
    return message.authorId === lastMessage?.authorId && minsAgo < maxTimeDifference;
  }

  public async emitTyping() { 
    const sinceLastTyped = new Date().getTime() - this.lastTypedAt?.getTime();      
    if (sinceLastTyped && sinceLastTyped < 5 * 1000) return; 
    
    this.lastTypedAt = new Date();
    await this.ws.emitAsync('TYPING_START', { channelId: this.channel.id }, this);
  }

  // emoji picker
  public addEmoji({ emoji }) {
    this.messageInput.nativeElement.value += emoji.native;
  }

  public onClick({ path }) {
    const pickerClicked = path
      .some(n => n
        && n.nodeName === 'EMOJI-MART'
        || n.classList?.contains('emoji-icon'));  

    this.emojiPickerOpen = pickerClicked;
  }
  
  public identifyMessage(index: number, item: Lean.Message) {
    return item.id;
  }
}
