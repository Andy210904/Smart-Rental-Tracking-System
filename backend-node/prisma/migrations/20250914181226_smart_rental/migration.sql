-- CreateTable
CREATE TABLE "Equipment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "equipment_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "site_id" TEXT,
    "check_out_date" TEXT,
    "check_in_date" TEXT,
    "engine_hours_per_day" REAL NOT NULL DEFAULT 0,
    "idle_hours_per_day" REAL NOT NULL DEFAULT 0,
    "operating_days" INTEGER NOT NULL DEFAULT 0,
    "last_operator_id" TEXT,
    "model" TEXT,
    "manufacturer" TEXT,
    "year" INTEGER,
    "serial_number" TEXT,
    "status" TEXT NOT NULL DEFAULT 'available',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Site" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "site_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "address" TEXT,
    "contact_person" TEXT,
    "contact_phone" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Operator" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "operator_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "license_number" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "certification_level" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Rental" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "equipment_id" INTEGER NOT NULL,
    "site_id" INTEGER,
    "operator_id" INTEGER,
    "check_out_date" DATETIME NOT NULL,
    "check_in_date" DATETIME,
    "expected_return_date" DATETIME,
    "rental_rate_per_day" REAL,
    "total_cost" REAL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Rental_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "Equipment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Rental_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "Site" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Rental_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "Operator" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UsageLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "rental_id" INTEGER NOT NULL,
    "equipment_id" INTEGER NOT NULL,
    "operator_id" INTEGER,
    "date" DATETIME NOT NULL,
    "engine_hours" REAL NOT NULL DEFAULT 0,
    "idle_hours" REAL NOT NULL DEFAULT 0,
    "fuel_usage" REAL NOT NULL DEFAULT 0,
    "location_lat" REAL,
    "location_lng" REAL,
    "condition_rating" INTEGER,
    "maintenance_required" BOOLEAN NOT NULL DEFAULT false,
    "maintenance_notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UsageLog_rental_id_fkey" FOREIGN KEY ("rental_id") REFERENCES "Rental" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UsageLog_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "Equipment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UsageLog_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "Operator" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "rental_id" INTEGER,
    "equipment_id" INTEGER,
    "alert_type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" DATETIME,
    "resolved_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MaintenanceRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "equipment_id" INTEGER NOT NULL,
    "maintenance_type" TEXT NOT NULL,
    "description" TEXT,
    "cost" REAL,
    "scheduled_date" DATETIME,
    "completed_date" DATETIME,
    "next_maintenance_date" DATETIME,
    "technician_name" TEXT,
    "vendor" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "MaintenanceRecord_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "Equipment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DemandForecast" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "site_id" INTEGER NOT NULL,
    "equipment_type" TEXT NOT NULL,
    "forecast_date" DATETIME NOT NULL,
    "predicted_demand" INTEGER NOT NULL,
    "confidence_score" REAL NOT NULL,
    "actual_demand" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DemandForecast_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "Site" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_equipment_id_key" ON "Equipment"("equipment_id");

-- CreateIndex
CREATE UNIQUE INDEX "Site_site_id_key" ON "Site"("site_id");

-- CreateIndex
CREATE UNIQUE INDEX "Operator_operator_id_key" ON "Operator"("operator_id");
