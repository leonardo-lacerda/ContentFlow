import {
  Controller,
  Get,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AnnouncementsService } from '@gitroom/nestjs-libraries/database/prisma/announcements/announcements.service';

@ApiTags('Announcements')
@Controller('/announcements')
export class AnnouncementsController {
  constructor(private _announcementsService: AnnouncementsService) {}

  @Get('/')
  async getAnnouncements() {
    return this._announcementsService.getAnnouncements();
  }

}
