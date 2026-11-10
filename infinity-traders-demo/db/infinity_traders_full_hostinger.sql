-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: infinity_traders_db
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `audit_log`
--

DROP TABLE IF EXISTS `audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `audit_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `entity` varchar(50) NOT NULL,
  `entity_id` int(11) DEFAULT NULL,
  `detail` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`detail`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `audit_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=79 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_log`
--

LOCK TABLES `audit_log` WRITE;
/*!40000 ALTER TABLE `audit_log` DISABLE KEYS */;
INSERT INTO `audit_log` VALUES (1,1,'LOGIN','users',1,'{\"username\":\"admin\"}','127.0.0.1','2026-10-30 09:05:10'),(2,1,'CREATE_PRODUCT','products',1,'{\"name\":\"Air Jordan 1 High OG\",\"sku\":\"AJ1-HIGH-001\"}','127.0.0.1','2026-10-30 09:05:10'),(3,1,'CREATE_SUPPLIER','suppliers',1,'{\"name\":\"Nike Direct India\"}','127.0.0.1','2026-10-30 09:05:10'),(4,1,'CREATE_CUSTOMER','customers',1,'{\"name\":\"Vikram Malhotra\",\"phone\":\"9123456789\"}','127.0.0.1','2026-10-30 09:05:11'),(5,1,'CREATE_INVOICE','sales_invoices',1,'{\"invoice_no\":\"IT-INV-0001\",\"grand_total\":29498,\"items_count\":1}','127.0.0.1','2026-10-30 09:05:11'),(6,1,'LOGOUT','users',1,'{\"username\":\"admin\"}','127.0.0.1','2026-10-30 09:05:11'),(7,1,'LOGIN','users',1,'{\"username\":\"admin\"}','127.0.0.1','2026-10-30 09:05:17'),(8,1,'CREATE_SUPPLIER','suppliers',2,'{\"name\":\"Nike Direct India\"}','127.0.0.1','2026-10-30 09:05:17'),(9,1,'CREATE_CUSTOMER','customers',2,'{\"name\":\"Vikram Malhotra\",\"phone\":\"9123456789\"}','127.0.0.1','2026-10-30 09:05:17'),(10,1,'CREATE_INVOICE','sales_invoices',2,'{\"invoice_no\":\"IT-INV-0002\",\"grand_total\":29498,\"items_count\":1}','127.0.0.1','2026-10-30 09:05:17'),(11,1,'LOGOUT','users',1,'{\"username\":\"admin\"}','127.0.0.1','2026-10-30 09:05:17'),(12,1,'LOGIN','users',1,'{\"username\":\"admin\"}','127.0.0.1','2026-10-30 09:05:44'),(13,1,'CREATE_SUPPLIER','suppliers',3,'{\"name\":\"Nike Direct India\"}','127.0.0.1','2026-10-30 09:05:44'),(14,1,'CREATE_CUSTOMER','customers',3,'{\"name\":\"Vikram Malhotra\",\"phone\":\"9123456789\"}','127.0.0.1','2026-10-30 09:05:44'),(15,1,'CREATE_INVOICE','sales_invoices',3,'{\"invoice_no\":\"IT-INV-0003\",\"grand_total\":29498,\"items_count\":1}','127.0.0.1','2026-10-30 09:05:44'),(16,1,'LOGOUT','users',1,'{\"username\":\"admin\"}','127.0.0.1','2026-10-30 09:05:44'),(17,1,'LOGIN','users',1,'{\"username\":\"admin\"}','127.0.0.1','2026-10-30 09:06:13'),(18,1,'CREATE_SUPPLIER','suppliers',4,'{\"name\":\"Nike Direct India\"}','127.0.0.1','2026-10-30 09:06:13'),(19,1,'CREATE_CUSTOMER','customers',4,'{\"name\":\"Vikram Malhotra\",\"phone\":\"9123456789\"}','127.0.0.1','2026-10-30 09:06:13'),(20,1,'CREATE_INVOICE','sales_invoices',4,'{\"invoice_no\":\"IT-INV-0004\",\"grand_total\":29498,\"items_count\":1}','127.0.0.1','2026-10-30 09:06:13'),(21,1,'LOGOUT','users',1,'{\"username\":\"admin\"}','127.0.0.1','2026-10-30 09:06:13'),(22,1,'LOGIN','users',1,'{\"username\":\"admin\"}','127.0.0.1','2026-10-30 09:11:35'),(23,1,'LOGIN','users',1,'{\"username\":\"admin\"}','127.0.0.1','2026-10-30 09:47:58'),(24,1,'CREATE_INVOICE','sales_invoices',5,'{\"invoice_no\":\"IT-INV-0005\",\"grand_total\":1000,\"items_count\":1}','127.0.0.1','2026-10-30 09:47:58'),(25,1,'CREATE_INVOICE','sales_invoices',6,'{\"invoice_no\":\"IT-INV-006\",\"grand_total\":14999,\"items_count\":1}','127.0.0.1','2026-10-30 09:54:10'),(26,1,'LOGIN','users',1,'{\"username\":\"admin\"}','127.0.0.1','2026-10-30 10:08:51'),(27,1,'LOGIN','users',1,'{\"username\":\"admin\"}','127.0.0.1','2026-10-30 10:12:05'),(28,1,'LOGOUT','users',1,'{\"username\":\"admin\"}','127.0.0.1','2026-10-30 10:20:02'),(29,1,'LOGIN','users',1,'{\"username\":\"admin\"}','127.0.0.1','2026-10-30 10:20:19'),(30,1,'LOGIN','users',1,'{\"username\":\"admin\"}','127.0.0.1','2026-10-30 10:49:18'),(31,1,'LOGIN','users',1,'{\"username\":\"admin\"}','127.0.0.1','2026-10-30 10:54:21'),(32,1,'CREATE','sales_returns',1,'{\"return_no\":\"RET-0001\",\"total_refund\":14999,\"items_count\":1}','127.0.0.1','2026-10-30 11:08:46'),(33,1,'CREATE_INVOICE','sales_invoices',1,'{\"invoice_no\":\"IT-INV-001\",\"grand_total\":1199,\"items_count\":1}','127.0.0.1','2026-10-30 11:18:54'),(34,1,'CREATE_PURCHASE','purchase_orders',1,'{\"purchase_no\":\"PO-0001\",\"total_amount\":108000,\"items_count\":1}','127.0.0.1','2026-10-30 11:26:01'),(35,1,'LOGIN','users',1,'{\"username\":\"admin\"}','::1','2026-10-30 15:00:18'),(36,1,'LOGIN','users',1,'{\"username\":\"admin\"}','::1','2026-10-30 15:01:54'),(37,1,'CREATE_INVOICE','sales_invoices',2,'{\"invoice_no\":\"IT-INV-002\",\"grand_total\":1999,\"items_count\":1}','::1','2026-10-30 18:19:26'),(38,1,'CREATE','sales_returns',1,'{\"return_no\":\"RET-0001\",\"total_refund\":1999,\"items_count\":1}','::1','2026-10-30 18:20:18'),(39,1,'LOGIN','users',1,'{\"username\":\"admin\"}','::1','2026-10-30 20:11:18'),(40,1,'UPDATE_SUPPLIER','suppliers',4,'{\"name\":\"Nike Direct India\"}','::1','2026-10-30 20:56:17'),(41,1,'UPDATE_SUPPLIER','suppliers',4,'{\"name\":\"Nike Direct India\"}','::1','2026-10-30 20:56:30'),(42,1,'LOGIN','users',1,'{\"username\":\"admin\"}','::1','2026-10-30 22:58:06'),(43,1,'CREATE_INVOICE','sales_invoices',3,'{\"invoice_no\":\"IT-INV-003\",\"grand_total\":2899,\"items_count\":1}','::1','2026-10-30 23:01:11'),(44,1,'CREATE_INVOICE','sales_invoices',4,'{\"invoice_no\":\"IT-INV-004\",\"grand_total\":12375,\"items_count\":1}','::1','2026-10-30 23:03:08'),(45,1,'CREATE','sales_returns',2,'{\"return_no\":\"RET-0002\",\"total_refund\":2999,\"items_count\":1}','::1','2026-10-30 23:04:56'),(46,1,'CREATE_PURCHASE','purchase_orders',2,'{\"purchase_no\":\"PO-0002\",\"total_amount\":32500,\"items_count\":1}','::1','2026-10-30 23:07:44'),(47,1,'CREATE_PURCHASE','purchase_orders',3,'{\"purchase_no\":\"PO-0003\",\"total_amount\":51600,\"items_count\":3}','::1','2026-10-30 23:11:32'),(48,1,'CREATE_SUPPLIER','suppliers',5,'{\"name\":\"Zubair\"}','::1','2026-10-30 23:13:51'),(49,1,'CREATE_PURCHASE','purchase_orders',4,'{\"purchase_no\":\"PO-0004\",\"total_amount\":9500,\"items_count\":1}','::1','2026-10-30 23:15:01'),(50,1,'LOGOUT','users',1,'{\"username\":\"admin\"}','::1','2026-10-30 23:21:19'),(51,1,'LOGIN','users',1,'{\"username\":\"admin\"}','::1','2026-10-30 23:21:31'),(52,1,'UPDATE_PRODUCT','products',15,'{\"name\":\"Lacoste Pima Cotton Graphic Teeshirt\",\"sku\":\"LAC-PIMA-TEE-14\"}','::1','2026-10-30 23:35:52'),(53,1,'UPDATE_PRODUCT','products',15,'{\"name\":\"Lacoste Pima Cotton Graphic Teeshirt\",\"sku\":\"LAC-PIMA-TEE-14\"}','::1','2026-10-30 23:36:17'),(54,1,'LOGOUT','users',1,'{\"username\":\"admin\"}','::1','2026-10-30 23:37:49'),(55,1,'LOGIN','users',1,'{\"username\":\"admin\"}','::1','2026-10-30 23:49:06'),(56,1,'LOGIN','users',1,'{\"username\":\"admin\"}','::1','2026-10-31 09:41:54'),(57,1,'CREATE_INVOICE','sales_invoices',5,'{\"invoice_no\":\"IT-INV-005\",\"grand_total\":1150,\"items_count\":1}','::1','2026-10-31 10:04:23'),(58,1,'CREATE_INVOICE','sales_invoices',6,'{\"invoice_no\":\"IT-INV-006\",\"grand_total\":2499,\"items_count\":1}','::1','2026-10-31 10:06:02'),(59,1,'CREATE_INVOICE','sales_invoices',7,'{\"invoice_no\":\"IT-INV-007\",\"grand_total\":2699,\"items_count\":1}','::1','2026-10-31 10:09:27'),(60,1,'CREATE_INVOICE','sales_invoices',8,'{\"invoice_no\":\"IT-INV-008\",\"grand_total\":2699,\"items_count\":1}','::1','2026-10-31 10:11:23'),(61,1,'CLEAR_CUSTOMER_DUE','customers',9,'{\"customer_name\":\"Chand Ahmad\",\"total_paid\":199,\"method\":\"UPI\",\"invoices\":[{\"invoice_no\":\"IT-INV-007\",\"paid\":199,\"balance_due\":500}]}','127.0.0.1','2026-10-31 10:15:54'),(62,1,'CLEAR_INVOICE_DUE','sales_invoices',8,'{\"invoice_no\":\"IT-INV-008\",\"paid_now\":500,\"new_balance\":199,\"payment_method\":\"Cash\"}','::1','2026-10-31 10:26:37'),(63,NULL,'CLEAR_INVOICE_DUE','sales_invoices',8,'{\"invoice_no\":\"IT-INV-008\",\"paid_now\":199,\"new_balance\":0,\"payment_method\":\"Cash\"}','127.0.0.1','2026-10-31 10:26:48'),(64,NULL,'CLEAR_CUSTOMER_DUE','customers',9,'{\"customer_name\":\"Chand Ahmad\",\"total_paid\":500,\"method\":\"UPI\",\"invoices\":[{\"invoice_no\":\"IT-INV-007\",\"paid\":500,\"balance_due\":0}]}','127.0.0.1','2026-10-31 10:27:15'),(65,1,'CREATE_INVOICE','sales_invoices',9,'{\"invoice_no\":\"IT-INV-009\",\"grand_total\":1999,\"items_count\":1}','::1','2026-10-31 10:53:33'),(66,1,'CREATE_INVOICE','sales_invoices',10,'{\"invoice_no\":\"IT-INV-010\",\"grand_total\":550,\"items_count\":1}','::1','2026-10-31 11:02:58'),(67,1,'UPDATE_SETTINGS','settings',1,'{\"business_name\":\"Infinity Traders\",\"invoice_prefix\":\"IT-INV\"}','::1','2026-10-31 11:20:57'),(68,1,'LOGIN','users',1,'{\"username\":\"admin\"}','::1','2026-11-03 12:37:37'),(69,1,'LOGOUT','users',1,'{\"username\":\"admin\"}','::1','2026-11-03 12:37:55'),(70,1,'LOGIN','users',1,'{\"username\":\"admin\"}','::1','2026-11-03 12:45:57'),(71,1,'LOGIN','users',1,'{\"username\":\"admin\"}','::1','2026-11-05 17:14:07'),(72,NULL,'CREATE_PURCHASE','purchase_orders',5,'{\"purchase_no\":\"PO-0005\",\"total_amount\":5900,\"items_count\":1}','127.0.0.1','2026-11-05 18:20:59'),(73,1,'CREATE_PURCHASE','purchase_orders',6,'{\"purchase_no\":\"PO-0006\",\"total_amount\":30000,\"items_count\":1}','::1','2026-11-05 18:24:54'),(74,NULL,'CREATE_PURCHASE','purchase_orders',7,'{\"purchase_no\":\"PO-0007\",\"total_amount\":24500,\"items_count\":3}','127.0.0.1','2026-11-05 18:38:21'),(75,1,'UPDATE_PRODUCT','products',17,'{\"name\":\"Premium nike t shirt\",\"sku\":\"PR-NK-TST\"}','::1','2026-11-05 18:49:34'),(76,1,'CREATE_PURCHASE','purchase_orders',8,'{\"purchase_no\":\"PO-0008\",\"total_amount\":114000,\"items_count\":2}','::1','2026-11-05 18:52:53'),(77,1,'CREATE_INVOICE','sales_invoices',11,'{\"invoice_no\":\"IT-INV-011\",\"grand_total\":1700,\"items_count\":1}','::1','2026-11-05 21:54:15'),(78,1,'CREATE','sales_returns',3,'{\"return_no\":\"RET-0003\",\"total_refund\":1700,\"items_count\":1}','::1','2026-11-05 22:17:29');
/*!40000 ALTER TABLE `audit_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `brands`
--

DROP TABLE IF EXISTS `brands`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `brands` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `brands`
--

LOCK TABLES `brands` WRITE;
/*!40000 ALTER TABLE `brands` DISABLE KEYS */;
INSERT INTO `brands` VALUES (1,'Nike','2026-10-30 08:39:22'),(2,'Adidas','2026-10-30 08:39:22'),(3,'ASICS','2026-10-30 08:39:22'),(4,'Puma','2026-10-30 08:39:22'),(5,'Crocs','2026-10-30 08:39:22'),(6,'Under Armour','2026-10-30 08:39:22'),(7,'Other','2026-10-30 08:39:22'),(8,'SEGA','2026-10-30 10:07:18'),(9,'Skechers','2026-10-30 10:07:18'),(10,'New Balance','2026-10-30 10:07:18'),(11,'Lacoste','2026-10-30 10:07:18'),(12,'Jordan','2026-10-30 10:07:18');
/*!40000 ALTER TABLE `brands` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,'Shoes','2026-10-30 08:39:22'),(2,'Sports Wears','2026-10-30 08:39:22'),(3,'Slippers','2026-10-30 08:39:22'),(4,'Footwear','2026-11-05 18:20:59'),(5,'Apparel','2026-11-05 18:38:21');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_payments`
--

DROP TABLE IF EXISTS `customer_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `customer_payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_id` int(11) DEFAULT NULL,
  `customer_name` varchar(200) NOT NULL,
  `invoice_id` int(11) DEFAULT NULL,
  `invoice_no` varchar(50) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` varchar(50) DEFAULT 'Cash',
  `payment_date` date NOT NULL,
  `notes` text DEFAULT NULL,
  `received_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `customer_id` (`customer_id`),
  KEY `invoice_id` (`invoice_id`),
  KEY `received_by` (`received_by`),
  CONSTRAINT `customer_payments_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `customer_payments_ibfk_2` FOREIGN KEY (`invoice_id`) REFERENCES `sales_invoices` (`id`) ON DELETE SET NULL,
  CONSTRAINT `customer_payments_ibfk_3` FOREIGN KEY (`received_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_payments`
--

LOCK TABLES `customer_payments` WRITE;
/*!40000 ALTER TABLE `customer_payments` DISABLE KEYS */;
INSERT INTO `customer_payments` VALUES (1,9,'Chand Ahmad',7,'IT-INV-007',199.00,'UPI','2026-10-31','GPay due payment test',1,'2026-10-31 10:15:54'),(2,9,'Chand Ahmad',8,'IT-INV-008',500.00,'Cash','2026-10-31','Settlement for invoice IT-INV-008',1,'2026-10-31 10:26:37'),(3,9,'Chand Ahmad',8,'IT-INV-008',199.00,'Cash','2026-10-31','Counter cash payment for bill IT-INV-008',1,'2026-10-31 10:26:48'),(4,9,'Chand Ahmad',7,'IT-INV-007',500.00,'UPI','2026-10-31','Settling all remaining dues via PhonePe',1,'2026-10-31 10:27:15');
/*!40000 ALTER TABLE `customer_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `customers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `gstin` varchar(20) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (1,'Vikram Malhotra','9123456789','vikram@example.com',NULL,NULL,'2026-10-30 09:05:11'),(2,'Vikram Malhotra','9123456789','vikram@example.com',NULL,NULL,'2026-10-30 09:05:17'),(3,'Vikram Malhotra','9123456789','vikram@example.com',NULL,NULL,'2026-10-30 09:05:44'),(4,'Vikram Malhotra','9123456789','vikram@example.com',NULL,NULL,'2026-10-30 09:06:13'),(5,'Rajesh Verma','9823456789',NULL,'Shop 14, MG Road, Pune',NULL,'2026-10-30 09:30:24'),(6,'Rahul Verma','9811223344',NULL,'B-12, Sector 18, Noida',NULL,'2026-10-30 09:47:58'),(7,'MD UMAR KHATTAB KHAN','09693517942',NULL,'putki',NULL,'2026-10-30 09:54:10'),(8,'sanauallah','9658746985',NULL,'Bhikhrazpur',NULL,'2026-10-31 10:04:23'),(9,'Chand Ahmad','965897456',NULL,'Baliapur',NULL,'2026-10-31 10:06:02'),(10,'salamat','9658736598',NULL,'singiyatand',NULL,'2026-10-31 11:02:58'),(11,'md shams','9687894569',NULL,'raniganj',NULL,'2026-11-05 21:54:15');
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `products` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `sku` varchar(100) NOT NULL,
  `barcode` varchar(100) DEFAULT NULL,
  `category_id` int(11) DEFAULT NULL,
  `subcategory_id` int(11) DEFAULT NULL,
  `brand_id` int(11) DEFAULT NULL,
  `size` varchar(50) DEFAULT NULL,
  `color` varchar(50) DEFAULT NULL,
  `image_url` text DEFAULT NULL,
  `purchase_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `selling_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `stock` int(11) NOT NULL DEFAULT 0,
  `low_stock_threshold` int(11) DEFAULT 3,
  `notes` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `sku` (`sku`),
  KEY `category_id` (`category_id`),
  KEY `subcategory_id` (`subcategory_id`),
  KEY `brand_id` (`brand_id`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `products_ibfk_2` FOREIGN KEY (`subcategory_id`) REFERENCES `subcategories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `products_ibfk_3` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1,'Air Jordan 1 High OG','AJ1-HIGH-001',NULL,1,2,1,'9','Chicago Red',NULL,7500.00,14999.00,15,3,NULL,1,'2026-10-30 09:05:10','2026-10-30 11:29:32'),(2,'Nike P-6000 Retro Metallic','NIKE-P6000-01','890100100101',1,2,1,'8','Metallic Silver / White','https://res.cloudinary.com/dk0lpxu3/image/upload/f_auto,q_auto/v1787137373/jft3pwtmirj0tueb49j4.jpg',1800.00,2999.00,85,4,'Nike P-6000 draws on the 2006 Nike Air Pegasus, iconic breathable mesh style with foam cushioning.',1,'2026-10-30 10:07:18','2026-10-30 11:26:01'),(3,'Nike Air Jordan 1 High University Blue','JOR-AJ1-UNIV-02','890100100102',1,2,12,'9','University Blue / White','https://res.cloudinary.com/dk0lpxu3/image/upload/f_auto,q_auto/v1787137499/chjwronyjlm41zomu4yl.jpg',1500.00,2499.00,17,3,'Pure premium leather high-top silhouette in iconic University Blue colorway with Air-Sole unit.',1,'2026-10-30 10:07:18','2026-10-31 10:06:02'),(4,'Adidas Ultraboost Light Running Shoes','ADI-UB-LIGHT-03','890100100103',1,1,2,'8','Core Black','https://res.cloudinary.com/dk0lpxu3/image/upload/f_auto,q_auto/v1787137516/jum2b8kd6ijptxnxfafh.jpg',1650.00,2699.00,20,4,'Epic energy return with Light BOOST midsole, Linear Energy Push system and Continental rubber outsole.',1,'2026-10-30 10:07:18','2026-10-31 10:11:23'),(5,'ASICS S4 Yogiri Racing Running Shoes','ASICS-S4-YOG-04','890100100104',1,1,3,'9','Neon Glow / Black','https://res.cloudinary.com/dk0lpxu3/image/upload/f_auto,q_auto/v1787137502/lblba9h6sxtwwuqsnuwv.jpg',1850.00,2999.00,15,3,'Designed for sub-4 marathon runners. Carbon plate embedded between FlyteFoam Turbo layers.',1,'2026-10-30 10:07:18','2026-10-30 23:04:56'),(6,'Under Armour HOVR Tracking Shoes','UA-TRACK-HOVR-05','890100100105',1,1,6,'8.5','Tactical Black / Orange','https://res.cloudinary.com/dk0lpxu3/image/upload/f_auto,q_auto/v1787137447/pu3tqvtobxht9tuy4ir9.jpg',1950.00,3199.00,20,4,'Unbelievable grip, rugged high-abrasion rubber lugged outsole, engineered for trekking & trail running.',1,'2026-10-30 10:07:18','2026-10-30 10:53:29'),(7,'AIR SEGA Running Shoes - Black Edition','SEGA-AIR-BLK-06','890100100106',1,12,8,'7','Jet Black','https://res.cloudinary.com/dk0lpxu3/image/upload/f_auto,q_auto/v1787137467/dbd9lkwvyrcjjqfxz5ld.jpg',330.00,555.00,70,8,'Best value daily running shoes in India with air-cushioned shock absorbing heel for sports & physical training.',1,'2026-10-30 10:07:18','2026-10-30 23:11:32'),(8,'AIR SEGA Running Shoes - Sport Gray','SEGA-AIR-GRY-07','890100100107',1,12,8,'8','Sport Gray','https://res.cloudinary.com/dk0lpxu3/image/upload/f_auto,q_auto/v1787137481/t5rhll7sxakoijvb13v5.jpg',330.00,555.00,45,8,'Original Sega Air series athletic footwear, durable synthetic mesh upper with flexible grip sole.',1,'2026-10-30 10:07:18','2026-10-30 10:53:29'),(9,'Crocs LiteRide 360 Clogs','CROCS-LR360-08','890100100108',3,11,5,'8','Black / Slate Grey','https://res.cloudinary.com/dk0lpxu3/image/upload/f_auto,q_auto/v1787137445/x5rxlptrhrc4jiz2k3pa.jpg',680.00,1150.00,34,5,'Plush LiteRide 360 foam footbed for sink-in softness and pressure-mapped all-day active recovery.',1,'2026-10-30 10:07:18','2026-10-31 10:04:23'),(10,'Skechers D\'Lites Multicoloured Sneakers','SKX-DLITES-MUL-09','890100100109',1,2,9,'8','Multi-Colour Pastel','https://res.cloudinary.com/dk0lpxu3/image/upload/f_auto,q_auto/v1787137491/imiu5ypjkqct4cja1j2x.jpg',1050.00,1799.00,40,4,'Chunky retro sneaker styling with Air-Cooled Memory Foam cushioned comfort insole.',1,'2026-10-30 10:07:18','2026-10-30 23:11:32'),(11,'New Balance 574 Heritage Classic','NB-574-CLSC-10','890100100110',1,2,10,'9','Navy / Cloud Grey','https://res.cloudinary.com/dk0lpxu3/image/upload/f_auto,q_auto/v1787137486/txzaqdyya1dy4xf5hbqf.jpg',1200.00,1999.00,43,4,'Timeless hybrid road/trail design with ENCAP midsole cushioning that combines lightweight EVA with durable polyurethane.',1,'2026-10-30 10:07:18','2026-10-31 10:53:33'),(12,'Adidas Indian Crest Athletic Performance T-Shirt','ADI-IND-TEE-11','890100100111',2,13,2,'L','India Royal Blue','https://res.cloudinary.com/dk0lpxu3/image/upload/f_auto,q_auto/v1787137506/baqp687524pfkvjszxji.jpg',380.00,649.00,40,6,'AEROREADY moisture-absorbing technology with official Indian athletic crest on chest.',1,'2026-10-30 10:07:18','2026-10-30 10:07:18'),(13,'Adidas Polo Collar Matty Dry-Fit T-Shirt','ADI-POLO-DRY-12','890100100112',2,13,2,'XL','Solid White / Black 3-Stripes','https://res.cloudinary.com/dk0lpxu3/image/upload/f_auto,q_auto/v1787137454/vhiokjbadwg7ww6ddtec.jpg',320.00,550.00,4,5,'Imported matty dry-fit polo t-shirt with ribbed collar for athletic, golf, and casual club wear.',1,'2026-10-30 10:07:18','2026-10-31 11:02:58'),(14,'Under Armour HeatGear Round Neck Training Tee','UA-HEAT-RN-13','890100100113',2,8,6,'M','Anthracite Gray','https://res.cloudinary.com/dk0lpxu3/image/upload/f_auto,q_auto/v1787137452/t7jeaznrma9eyxz3zkyh.jpg',380.00,649.00,57,5,'HeatGear technical fabric delivers superior coverage without weighing you down, 4-way stretch construction.',1,'2026-10-30 10:07:18','2026-10-30 23:15:01'),(15,'Lacoste Pima Cotton Graphic Teeshirt','LAC-PIMA-TEE-14',NULL,2,13,11,'L','Classic Black','https://res.cloudinary.com/dk0lpxu3/image/upload/f_auto,q_auto:eco,c_limit,w_900/v1787137373/jft3pwtmirj0tueb49j4.jpg',650.00,1199.00,69,4,NULL,1,'2026-10-30 10:07:18','2026-10-30 23:36:17'),(17,'Premium nike t shirt','PR-NK-TST',NULL,2,13,1,'M','Black/white',NULL,1500.00,2000.00,20,3,NULL,1,'2026-11-05 18:24:54','2026-11-05 18:49:34'),(21,'cotton t shirt puma','CT-TS-PM-S',NULL,2,13,4,'S','black',NULL,1600.00,2100.00,50,3,NULL,1,'2026-11-05 18:52:53','2026-11-05 18:52:53'),(22,'cotton t shirt puma','CT-TS-PM-M',NULL,2,13,4,'M','black',NULL,1700.00,2200.00,20,3,NULL,1,'2026-11-05 18:52:53','2026-11-05 22:17:29');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_order_items`
--

DROP TABLE IF EXISTS `purchase_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_order_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `purchase_id` int(11) NOT NULL,
  `product_id` int(11) DEFAULT NULL,
  `sku` varchar(100) DEFAULT NULL,
  `product_name` varchar(200) DEFAULT NULL,
  `size` varchar(50) DEFAULT NULL,
  `color` varchar(50) DEFAULT NULL,
  `qty` int(11) NOT NULL,
  `cost_price` decimal(10,2) NOT NULL,
  `selling_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `discount` decimal(10,2) DEFAULT 0.00,
  `line_total` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `purchase_id` (`purchase_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `purchase_order_items_ibfk_1` FOREIGN KEY (`purchase_id`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `purchase_order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_order_items`
--

LOCK TABLES `purchase_order_items` WRITE;
/*!40000 ALTER TABLE `purchase_order_items` DISABLE KEYS */;
INSERT INTO `purchase_order_items` VALUES (1,1,2,'NIKE-P6000-01','Nike P-6000 Retro Metallic',NULL,NULL,60,1800.00,0.00,0.00,108000.00),(2,2,15,'LAC-PIMA-TEE-14','Lacoste Pima Cotton Graphic Teeshirt',NULL,NULL,50,650.00,0.00,0.00,32500.00),(3,3,11,'NB-574-CLSC-10','New Balance 574 Heritage Classic',NULL,NULL,20,1200.00,0.00,0.00,24000.00),(4,3,10,'SKX-DLITES-MUL-09','Skechers D\'Lites Multicoloured Sneakers',NULL,NULL,20,1050.00,0.00,0.00,21000.00),(5,3,7,'SEGA-AIR-BLK-06','AIR SEGA Running Shoes - Black Edition',NULL,NULL,20,330.00,0.00,0.00,6600.00),(6,4,14,'UA-HEAT-RN-13','Under Armour HeatGear Round Neck Training Tee',NULL,NULL,25,380.00,0.00,0.00,9500.00),(8,6,17,'PR-NK-TST','Premium nike t shirt','M','25',20,1500.00,2000.00,0.00,30000.00),(12,8,21,'CT-TS-PM-S','cotton t shirt puma','S','black',50,1600.00,2100.00,0.00,80000.00),(13,8,22,'CT-TS-PM-M','cotton t shirt puma','M','black',20,1700.00,2200.00,0.00,34000.00);
/*!40000 ALTER TABLE `purchase_order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_orders`
--

DROP TABLE IF EXISTS `purchase_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `purchase_no` varchar(50) NOT NULL,
  `supplier_id` int(11) DEFAULT NULL,
  `supplier_name` varchar(200) DEFAULT NULL,
  `supplier_phone` varchar(50) DEFAULT NULL,
  `supplier_address` text DEFAULT NULL,
  `supplier_invoice_no` varchar(100) DEFAULT NULL,
  `date` date NOT NULL,
  `gst_enabled` tinyint(1) DEFAULT 0,
  `gst_rate` decimal(5,2) DEFAULT 0.00,
  `subtotal` decimal(10,2) DEFAULT 0.00,
  `gst_amount` decimal(10,2) DEFAULT 0.00,
  `total_amount` decimal(10,2) DEFAULT 0.00,
  `amount_paid` decimal(10,2) DEFAULT 0.00,
  `balance_due` decimal(10,2) DEFAULT 0.00,
  `payment_status` enum('Paid','Partial','Unpaid') DEFAULT 'Paid',
  `notes` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `purchase_no` (`purchase_no`),
  KEY `supplier_id` (`supplier_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `purchase_orders_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `purchase_orders_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_orders`
--

LOCK TABLES `purchase_orders` WRITE;
/*!40000 ALTER TABLE `purchase_orders` DISABLE KEYS */;
INSERT INTO `purchase_orders` VALUES (1,'PO-0001',4,'Nike Direct India','9876543210',NULL,NULL,'2026-10-30',0,18.00,108000.00,0.00,108000.00,108000.00,0.00,'Paid',NULL,1,'2026-10-30 11:26:01'),(2,'PO-0002',4,'Nike Direct India','9876543210',NULL,'SUP-IN-002','2026-10-30',0,18.00,32500.00,0.00,32500.00,32500.00,0.00,'Paid',NULL,1,'2026-10-30 23:07:44'),(3,'PO-0003',2,'Nike Direct India','9876543210',NULL,'SUP-IN-002','2026-10-30',0,18.00,51600.00,0.00,51600.00,51600.00,0.00,'Paid',NULL,1,'2026-10-30 23:11:32'),(4,'PO-0004',5,'Zubair','+919693517942','Vill- Taj mohalla Dangapara, po+ps Baliapur, Dist- Dhanbad','SUP-IN-003','2026-10-30',0,18.00,9500.00,0.00,9500.00,9500.00,0.00,'Paid',NULL,1,'2026-10-30 23:15:01'),(6,'PO-0006',7,'ABC','9689745698','Dhanbad','SUP-IN-006','2026-11-05',0,18.00,30000.00,0.00,30000.00,30000.00,0.00,'Paid',NULL,1,'2026-11-05 18:24:54'),(8,'PO-0008',7,'ABC','9689745698','Dhanbad',NULL,'2026-11-05',0,18.00,114000.00,0.00,114000.00,114000.00,0.00,'Paid',NULL,1,'2026-11-05 18:52:53');
/*!40000 ALTER TABLE `purchase_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_invoice_items`
--

DROP TABLE IF EXISTS `sales_invoice_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sales_invoice_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `invoice_id` int(11) NOT NULL,
  `product_id` int(11) DEFAULT NULL,
  `sku` varchar(100) DEFAULT NULL,
  `product_name` varchar(200) DEFAULT NULL,
  `size` varchar(50) DEFAULT NULL,
  `qty` int(11) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `discount` decimal(10,2) DEFAULT 0.00,
  `line_total` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `invoice_id` (`invoice_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `sales_invoice_items_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `sales_invoices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sales_invoice_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_invoice_items`
--

LOCK TABLES `sales_invoice_items` WRITE;
/*!40000 ALTER TABLE `sales_invoice_items` DISABLE KEYS */;
INSERT INTO `sales_invoice_items` VALUES (1,1,15,'LAC-PIMA-TEE-14','Lacoste Pima Cotton Graphic Teeshirt','L',1,1199.00,0.00,1199.00),(2,2,11,'NB-574-CLSC-10','New Balance 574 Heritage Classic','9',1,1999.00,0.00,1999.00),(3,3,5,'ASICS-S4-YOG-04','ASICS S4 Yogiri Racing Running Shoes','9',1,2999.00,100.00,2899.00),(4,4,13,'ADI-POLO-DRY-12','Adidas Polo Collar Matty Dry-Fit T-Shirt','XL',25,550.00,1375.00,12375.00),(5,5,9,'CROCS-LR360-08','Crocs LiteRide 360 Clogs','8',1,1150.00,0.00,1150.00),(6,6,3,'JOR-AJ1-UNIV-02','Nike Air Jordan 1 High University Blue','9',1,2499.00,0.00,2499.00),(7,7,4,'ADI-UB-LIGHT-03','Adidas Ultraboost Light Running Shoes','8',1,2699.00,0.00,2699.00),(8,8,4,'ADI-UB-LIGHT-03','Adidas Ultraboost Light Running Shoes','8',1,2699.00,0.00,2699.00),(9,9,11,'NB-574-CLSC-10','New Balance 574 Heritage Classic','9',1,1999.00,0.00,1999.00),(10,10,13,'ADI-POLO-DRY-12','Adidas Polo Collar Matty Dry-Fit T-Shirt','XL',1,550.00,0.00,550.00),(11,11,22,'CT-TS-PM-M','cotton t shirt puma','M',1,2200.00,500.00,1700.00);
/*!40000 ALTER TABLE `sales_invoice_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_invoices`
--

DROP TABLE IF EXISTS `sales_invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sales_invoices` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `invoice_no` varchar(50) NOT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `customer_name` varchar(200) DEFAULT NULL,
  `customer_phone` varchar(20) DEFAULT NULL,
  `customer_address` text DEFAULT NULL,
  `date` date NOT NULL,
  `payment_method` varchar(50) DEFAULT 'Cash',
  `gst_enabled` tinyint(1) DEFAULT 0,
  `gst_rate` decimal(5,2) DEFAULT 0.00,
  `gst_type` enum('intrastate','interstate') DEFAULT 'intrastate',
  `subtotal` decimal(10,2) DEFAULT 0.00,
  `total_discount` decimal(10,2) DEFAULT 0.00,
  `taxable_amount` decimal(10,2) DEFAULT 0.00,
  `cgst` decimal(10,2) DEFAULT 0.00,
  `sgst` decimal(10,2) DEFAULT 0.00,
  `igst` decimal(10,2) DEFAULT 0.00,
  `grand_total` decimal(10,2) DEFAULT 0.00,
  `amount_paid` decimal(10,2) DEFAULT 0.00,
  `balance_due` decimal(10,2) DEFAULT 0.00,
  `payment_status` enum('Paid','Partial','Unpaid') DEFAULT 'Paid',
  `notes` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoice_no` (`invoice_no`),
  KEY `customer_id` (`customer_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `sales_invoices_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `sales_invoices_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_invoices`
--

LOCK TABLES `sales_invoices` WRITE;
/*!40000 ALTER TABLE `sales_invoices` DISABLE KEYS */;
INSERT INTO `sales_invoices` VALUES (1,'IT-INV-001',7,'MD UMAR KHATTAB KHAN','09693517942','Vill- Taj mohalla Dangapara, po+ps Baliapur, Dist- Dhanbad, St- Jharkhand, pin- 828201','2026-10-30','Cash',0,18.00,'intrastate',1199.00,0.00,1199.00,0.00,0.00,0.00,1199.00,1199.00,0.00,'Paid',NULL,1,'2026-10-30 11:18:54'),(2,'IT-INV-002',NULL,'Walk-in Customer','',NULL,'2026-10-30','Cash',0,18.00,'intrastate',1999.00,0.00,1999.00,0.00,0.00,0.00,1999.00,1998.98,0.02,'Partial',NULL,1,'2026-10-30 18:19:26'),(3,'IT-INV-003',7,'saif','09693517942','putki','2026-10-30','Cash',0,18.00,'intrastate',2999.00,100.00,2899.00,0.00,0.00,0.00,2899.00,2099.00,800.00,'Partial',NULL,1,'2026-10-30 23:01:11'),(4,'IT-INV-004',NULL,'Walk-in Customer','',NULL,'2026-10-30','Cash',0,18.00,'intrastate',13750.00,1375.00,12375.00,0.00,0.00,0.00,12375.00,12375.00,0.00,'Paid',NULL,1,'2026-10-30 23:03:08'),(5,'IT-INV-005',8,'sanauallah','9658746985','Bhikhrazpur','2026-10-31','Cash',0,18.00,'intrastate',1150.00,0.00,1150.00,0.00,0.00,0.00,1150.00,1150.00,0.00,'Paid',NULL,1,'2026-10-31 10:04:23'),(6,'IT-INV-006',9,'Chand Ahmad','965897456','Baliapur','2026-10-31','UPI',0,18.00,'intrastate',2499.00,0.00,2499.00,0.00,0.00,0.00,2499.00,2499.00,0.00,'Paid',NULL,1,'2026-10-31 10:06:02'),(7,'IT-INV-007',9,'Chand Ahmad','965897456','Baliapur','2026-10-31','Cash',0,18.00,'intrastate',2699.00,0.00,2699.00,0.00,0.00,0.00,2699.00,2699.00,0.00,'Paid',NULL,1,'2026-10-31 10:09:27'),(8,'IT-INV-008',9,'Chand Ahmad','965897456','Baliapur','2026-10-31','Cash',0,18.00,'intrastate',2699.00,0.00,2699.00,0.00,0.00,0.00,2699.00,2699.00,0.00,'Paid',NULL,1,'2026-10-31 10:11:23'),(9,'IT-INV-009',NULL,'Walk-in Customer','',NULL,'2026-10-31','Cash',0,18.00,'intrastate',1999.00,0.00,1999.00,0.00,0.00,0.00,1999.00,1999.00,0.00,'Paid',NULL,1,'2026-10-31 10:53:33'),(10,'IT-INV-010',10,'salamat','9658736598','singiyatand','2026-10-31','Cash',0,18.00,'intrastate',550.00,0.00,550.00,0.00,0.00,0.00,550.00,550.00,0.00,'Paid',NULL,1,'2026-10-31 11:02:58'),(11,'IT-INV-011',11,'md shams','9687894569','raniganj','2026-11-05','Cash',0,18.00,'intrastate',2200.00,500.00,1700.00,0.00,0.00,0.00,1700.00,1700.00,0.00,'Paid',NULL,1,'2026-11-05 21:54:15');
/*!40000 ALTER TABLE `sales_invoices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_return_items`
--

DROP TABLE IF EXISTS `sales_return_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sales_return_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `return_id` int(11) NOT NULL,
  `product_id` int(11) DEFAULT NULL,
  `product_name` varchar(200) DEFAULT NULL,
  `sku` varchar(100) DEFAULT NULL,
  `size` varchar(50) DEFAULT NULL,
  `return_qty` int(11) NOT NULL DEFAULT 1,
  `unit_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `refund_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `restock` tinyint(1) DEFAULT 1,
  `item_condition` varchar(100) DEFAULT 'Good (Restock)',
  PRIMARY KEY (`id`),
  KEY `return_id` (`return_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `sales_return_items_ibfk_1` FOREIGN KEY (`return_id`) REFERENCES `sales_returns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sales_return_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_return_items`
--

LOCK TABLES `sales_return_items` WRITE;
/*!40000 ALTER TABLE `sales_return_items` DISABLE KEYS */;
INSERT INTO `sales_return_items` VALUES (1,1,11,'New Balance 574 Heritage Classic','NB-574-CLSC-10','9',1,1999.00,1999.00,1,'Good (Restock)'),(2,2,5,'ASICS S4 Yogiri Racing Running Shoes','ASICS-S4-YOG-04','9',1,2999.00,2999.00,1,'Good (Restock)'),(3,3,22,'cotton t shirt puma','CT-TS-PM-M','M',1,1700.00,1700.00,1,'Good (Restock)');
/*!40000 ALTER TABLE `sales_return_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_returns`
--

DROP TABLE IF EXISTS `sales_returns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sales_returns` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `return_no` varchar(50) NOT NULL,
  `invoice_id` int(11) DEFAULT NULL,
  `invoice_no` varchar(50) DEFAULT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `customer_name` varchar(200) DEFAULT NULL,
  `customer_phone` varchar(20) DEFAULT NULL,
  `date` date NOT NULL,
  `total_refund_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `refund_method` varchar(50) DEFAULT 'Cash',
  `refund_status` enum('Completed','Pending','Store Credit') DEFAULT 'Completed',
  `reason` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `return_no` (`return_no`),
  KEY `invoice_id` (`invoice_id`),
  KEY `customer_id` (`customer_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `sales_returns_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `sales_invoices` (`id`) ON DELETE SET NULL,
  CONSTRAINT `sales_returns_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `sales_returns_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_returns`
--

LOCK TABLES `sales_returns` WRITE;
/*!40000 ALTER TABLE `sales_returns` DISABLE KEYS */;
INSERT INTO `sales_returns` VALUES (1,'RET-0001',2,'IT-INV-002',NULL,'Walk-in Customer','','2026-10-30',1999.00,'Cash','Completed','Size / Fitting Issue','',1,'2026-10-30 18:20:18'),(2,'RET-0002',3,'IT-INV-003',7,'saif','09693517942','2026-10-30',2999.00,'Cash','Completed','Size / Fitting Issue','',1,'2026-10-30 23:04:56'),(3,'RET-0003',11,'IT-INV-011',11,'md shams','9687894569','2026-11-05',1700.00,'Cash','Completed','Size / Fitting Issue','',1,'2026-11-05 22:17:29');
/*!40000 ALTER TABLE `sales_returns` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `settings`
--

DROP TABLE IF EXISTS `settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `business_name` varchar(200) DEFAULT 'Infinity Traders',
  `business_address` text DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `gstin` varchar(20) DEFAULT NULL,
  `default_gst_mode` tinyint(1) DEFAULT 0,
  `invoice_prefix` varchar(20) DEFAULT 'IT-INV',
  `currency` varchar(10) DEFAULT 'INR',
  `low_stock_threshold` int(11) DEFAULT 3,
  `invoice_footer_text` varchar(300) DEFAULT 'Thank you for shopping with Infinity Traders!',
  `next_invoice_num` int(11) DEFAULT 1,
  `next_purchase_num` int(11) DEFAULT 1,
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `settings`
--

LOCK TABLES `settings` WRITE;
/*!40000 ALTER TABLE `settings` DISABLE KEYS */;
INSERT INTO `settings` VALUES (1,'Infinity Traders','opposite navneet hotel dvc, Putki, Chirudih, Sialgudri, Jharkhand 828116','+91 062021 06616','contact@infinitytraders.com','',0,'IT-INV','INR',3,'Thank you for shopping with Infinity Traders! Terms: Goods once sold cannot be returned.',12,9,'2026-11-05 21:54:15');
/*!40000 ALTER TABLE `settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subcategories`
--

DROP TABLE IF EXISTS `subcategories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `subcategories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `category_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `subcategories_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subcategories`
--

LOCK TABLES `subcategories` WRITE;
/*!40000 ALTER TABLE `subcategories` DISABLE KEYS */;
INSERT INTO `subcategories` VALUES (1,1,'Running Shoes','2026-10-30 08:39:22'),(2,1,'Sneakers','2026-10-30 08:39:22'),(3,1,'Football Boots','2026-10-30 08:39:22'),(4,1,'Formal Shoes','2026-10-30 08:39:22'),(5,2,'Jerseys','2026-10-30 08:39:22'),(6,2,'Shorts','2026-10-30 08:39:22'),(7,2,'Tracksuits','2026-10-30 08:39:22'),(8,2,'Gym Wear','2026-10-30 08:39:22'),(9,3,'Flip Flops','2026-10-30 08:39:22'),(10,3,'Slides','2026-10-30 08:39:22'),(11,3,'Clogs','2026-10-30 08:39:22'),(12,1,'Air Sega','2026-10-30 10:07:18'),(13,2,'T-Shirts','2026-10-30 10:07:18'),(14,2,'Lowers','2026-10-30 10:07:18'),(15,4,'Running Shoes','2026-11-05 18:20:59'),(16,5,'T-Shirts','2026-11-05 18:38:21');
/*!40000 ALTER TABLE `subcategories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `suppliers`
--

DROP TABLE IF EXISTS `suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `suppliers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `contact_person` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `gstin` varchar(20) DEFAULT NULL,
  `outstanding_balance` decimal(10,2) DEFAULT 0.00,
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `suppliers`
--

LOCK TABLES `suppliers` WRITE;
/*!40000 ALTER TABLE `suppliers` DISABLE KEYS */;
INSERT INTO `suppliers` VALUES (1,'Nike Direct India','Rahul Sharma','9876543210','rahul@nikedirect.in',NULL,NULL,0.00,'Active','2026-10-30 09:05:10'),(2,'Nike Direct India','Rahul Sharma','9876543210','rahul@nikedirect.in',NULL,NULL,0.00,'Active','2026-10-30 09:05:17'),(3,'Nike Direct India','Rahul Sharma','9876543210','rahul@nikedirect.in',NULL,NULL,0.00,'Active','2026-10-30 09:05:44'),(4,'Nike Direct India','Rahul Sharma','9876543210','rahul@nikedirect.in',NULL,NULL,0.00,'Active','2026-10-30 09:06:13'),(5,'Zubair','986897546','+919693517942','abc@gmail.com','Vill- Taj mohalla Dangapara, po+ps Baliapur, Dist- Dhanbad',NULL,0.00,'Active','2026-10-30 23:13:51'),(7,'ABC',NULL,'9689745698',NULL,'Dhanbad',NULL,0.00,'Active','2026-11-05 18:24:54');
/*!40000 ALTER TABLE `suppliers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `full_name` varchar(100) DEFAULT NULL,
  `role` enum('admin','staff') DEFAULT 'admin',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin','$2y$10$7pformWFglmdOkPfIavjyuiL5/BvwIED6sDcaQd5y7NzUQSL6qcSi','System Administrator','admin',1,'2026-10-30 08:39:22');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-05 23:16:24
