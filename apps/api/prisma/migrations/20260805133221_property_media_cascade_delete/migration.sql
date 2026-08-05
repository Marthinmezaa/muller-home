-- DropForeignKey
ALTER TABLE "property_deletion_requests" DROP CONSTRAINT "property_deletion_requests_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "property_media" DROP CONSTRAINT "property_media_propertyId_fkey";

-- AddForeignKey
ALTER TABLE "property_media" ADD CONSTRAINT "property_media_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_deletion_requests" ADD CONSTRAINT "property_deletion_requests_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

