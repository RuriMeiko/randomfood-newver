import type { Command, CommandRegistry } from './types';

export class BotCommandRegistry implements CommandRegistry {
  private commands = new Map<string, Command>();

  register(command: Command): void {
    this.commands.set(command.name, command);
  }

  get(name: string): Command | undefined {
    return this.commands.get(name);
  }

  getAll(): Command[] {
    return Array.from(this.commands.values());
  }

  getHelpText(): string {
    const commands = this.getAll();
    return commands
      .map(cmd => `${cmd.name} - ${cmd.description}`)
      .join('\n');
  }
}