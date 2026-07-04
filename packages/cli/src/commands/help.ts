import { Command } from 'commander';
import type { Command as CommanderCommand } from 'commander';

export function createHelpCommand(parentCommands: Map<string, CommanderCommand>): Command {
  const cmd = new Command('help')
    .description('Show available commands and their descriptions')
    .argument('[name]', 'Command name for detailed help')
    .action((name) => {
      if (name) {
        const target = parentCommands.get(name);
        if (target) {
          target.outputHelp();
          return;
        }
        console.error(`Unknown command: ${name}`);
        process.exit(1);
      }

      console.log('Available commands:\n');
      for (const [cmdName, c] of parentCommands) {
        const desc = c.description() || '(no description)';
        console.log(`  ${cmdName.padEnd(16)} ${desc}`);
      }
    });
  return cmd;
}
