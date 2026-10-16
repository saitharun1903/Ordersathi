-- CreateTable
CREATE TABLE "StoredFile" (
    "key" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoredFile_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "StoredFile_workspaceId_idx" ON "StoredFile"("workspaceId");
