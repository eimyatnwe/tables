import { AngularCommonModule, LANGUAGE_KEY, PhraseProject } from '@gofive/angular-common'
import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { BrowserModule } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader'
import { CoreModule } from 'src/app/core/core.module'
import { environment } from 'src/environments/environment'
import { SharedModule } from 'src/app/shared/shared.module'
import { EmployeeComponent } from './employee.component'
import { ListViewModule } from '@syncfusion/ej2-angular-lists'
import { DirectiveModule } from 'src/app/shared/directive/directive.module'
import { EmployeeDetailComponent } from '../employee-detail/employee-detail.component'
import { OverlayContainer } from '@angular/cdk/overlay'
import { Go5OverlayContainer } from 'src/app/shared/helper/go5-cdk-overlay-container'
@NgModule({
	imports: [
		ListViewModule,
		SharedModule,
		CommonModule,
		BrowserModule,
		BrowserAnimationsModule,
		FormsModule,
		ReactiveFormsModule,
		CoreModule.forRoot(),
		AngularCommonModule.forRoot({
			apiUrlBase: environment.venioAPI,
			phraseProject: PhraseProject.Venio,
			assetsEnvironment: environment.assestEvn,
		}),
		NgxSkeletonLoaderModule,
		DirectiveModule,
		EmployeeDetailComponent,
	],
	declarations: [EmployeeComponent],
	exports: [EmployeeComponent],
	providers: [{ provide: OverlayContainer, useClass: Go5OverlayContainer }],
})
export class EmployeeModule {}
