-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('IDLE', 'RUNNING', 'DISABLED', 'ERROR');

-- CreateTable
CREATE TABLE "scheduled_workflow" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "cronExpression" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'IDLE',
    "lastRun" TIMESTAMP(3),
    "nextRun" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_workflow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_workflow_workflowId_key" ON "scheduled_workflow"("workflowId");

-- AddForeignKey
ALTER TABLE "scheduled_workflow" ADD CONSTRAINT "scheduled_workflow_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
