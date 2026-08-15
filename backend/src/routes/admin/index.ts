import { Router } from 'express';
import { adminAuth } from '../../middleware/adminAuth';
import { adminMediaRouter } from './media.routes';
import { adminProductsRouter } from './products.routes';
import { adminGalleryRouter } from './gallery.routes';
import { adminSpecialistsRouter } from './specialists.routes';
import { adminPagesRouter } from './pages.routes';
import { adminSettingsRouter } from './settings.routes';
import { adminOrdersRouter } from './orders.routes';
import { adminBookingsRouter } from './bookings.routes';

export const adminRouter = Router();

adminRouter.use(adminAuth);

adminRouter.use('/media', adminMediaRouter);
adminRouter.use('/products', adminProductsRouter);
adminRouter.use('/gallery', adminGalleryRouter);
adminRouter.use('/specialists', adminSpecialistsRouter);
adminRouter.use('/pages', adminPagesRouter);
adminRouter.use('/settings', adminSettingsRouter);
adminRouter.use('/orders', adminOrdersRouter);
adminRouter.use('/bookings', adminBookingsRouter);
