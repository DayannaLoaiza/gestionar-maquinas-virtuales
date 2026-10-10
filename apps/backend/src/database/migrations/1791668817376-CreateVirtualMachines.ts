import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Máquinas virtuales (RNF-virtual-machines-01 y RNF-virtual-machines-02). Generada con
 * `migration:generate`; el índice único sobre `lower("name")` se agregó a mano, porque TypeORM no
 * sincroniza índices por expresión (RF-virtual-machines-06).
 */
export class CreateVirtualMachines1791668817376 implements MigrationInterface {
  readonly name = 'CreateVirtualMachines1791668817376';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."vm_os" AS ENUM('Ubuntu', 'Debian', 'Rocky Linux', 'Red Hat Enterprise Linux', 'Windows Server')`,
    );
    await queryRunner.query(`CREATE TYPE "public"."vm_status" AS ENUM('Encendida', 'Apagada')`);
    await queryRunner.query(
      `CREATE TABLE "virtual_machines" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(63) NOT NULL, "cores" integer NOT NULL, "ram" integer NOT NULL, "disk" integer NOT NULL, "os" "public"."vm_os" NOT NULL, "status" "public"."vm_status" NOT NULL DEFAULT 'Apagada', "created_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_virtual_machines_disk" CHECK ("disk" BETWEEN 1 AND 65536), CONSTRAINT "CHK_virtual_machines_ram" CHECK ("ram" BETWEEN 1 AND 1024), CONSTRAINT "CHK_virtual_machines_cores" CHECK ("cores" BETWEEN 1 AND 128), CONSTRAINT "CHK_virtual_machines_name" CHECK ("name" ~ '^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$'), CONSTRAINT "PK_e6a3b4ed20fed871e0c10e0c32b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_virtual_machines_name_lower" ON "virtual_machines" (lower("name"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_virtual_machines_created_by" ON "virtual_machines" ("created_by")`,
    );
    await queryRunner.query(
      `ALTER TABLE "virtual_machines" ADD CONSTRAINT "FK_virtual_machines_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "virtual_machines" DROP CONSTRAINT "FK_virtual_machines_created_by"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_virtual_machines_created_by"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_virtual_machines_name_lower"`);
    await queryRunner.query(`DROP TABLE "virtual_machines"`);
    await queryRunner.query(`DROP TYPE "public"."vm_status"`);
    await queryRunner.query(`DROP TYPE "public"."vm_os"`);
  }
}
