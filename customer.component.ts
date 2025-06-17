import { Tag } from '../../../../../src/app/shared/model/venio.model'
import { AlertDialogService } from 'src/app/shared/repository/alert.service'
import {
	ChangeDetectorRef,
	Component,
	ElementRef,
	OnInit,
	ViewChild,
	Input,
	OnChanges,
	Output,
	EventEmitter,
	ViewEncapsulation,
	OnDestroy,
	SimpleChanges,
	HostListener,
	computed,
	inject,
} from '@angular/core'
import { DateFormat, PhraseProject, PhraseService } from '@gofive/angular-common'
import {
	Subscription,
	Subject,
	BehaviorSubject,
	combineLatest,
	Observable,
	from,
	lastValueFrom,
	firstValueFrom,
	of,
} from 'rxjs'
import { BaseComponent } from 'src/app/shared/component/base/base.component'
import { ConversationAction } from 'src/app/shared/enum/conversation.enum'
import {
	CustomerFilterTypes,
	CustomerTab,
	CustomerState,
	OwnerType,
	CustomerFilterData,
	FollowUpType,
	ActionState,
	MatchedType,
	LeadState,
	ProspectState,
	CustomerType,
	StatesGroup,
	TableCategories,
} from 'src/app/shared/enum/customer.enum'
import { Permissions } from 'src/app/shared/enum/permissions.enum'
import { Preferences } from 'src/app/shared/enum/preferences.enum'
import { CustomerStatuses, Statuses } from 'src/app/shared/enum/statuses.enum'
import { UserService } from 'src/app/shared/repository/user.service'
import { catchError, debounceTime, delay, first, switchMap, takeUntil, tap } from 'rxjs/operators'
import { columnModel } from 'src/app/shared/model/customer.model'
import { CustomerAddComponent } from './customer-add/customer-add.component'
import { ResEvent, ResEventType } from 'src/app/shared/model/event.model'
import { Contact, CustomerDetail } from 'src/app/shared/model/venio.model'
import { environment } from 'src/environments/environment'
import { ContactComponent } from '../../../../../src/app/shared/component/sidebar/contact/contact.component'
import { ContactAddComponent } from 'src/app/shared/component/sidebar/contact/contact-add/contact-add.component'
import { TagService } from 'src/app/shared/repository/tag.service'
import { DropdownSelectMode, FilterDataSource } from '@gofive/design-system-dropdown'
import { CustomerManagementService } from './customer.service'
import {
	CustomerManagementFilterModel,
	CustomerManagementModel,
	CustomerManagementWithByIdModel,
} from 'src/app/shared/services/customer/customer.model'
import { CustomerManagementViewModel } from './customer.viewmodel'
import { BADGE_SIZE, STATUS_NAME } from '@gofive/design-system-badge'
import { TabCategories } from '@gofive/design-system-navigation'
import { isNumber } from '../../../../../src/app/shared/helper/util'
import { headerTab, filterToolbar } from '../constansts/customer-state.constansts'
import { CustomerManagementMapper } from './mapper/customer-managment-mapper'
import { columnCommon, columnContract, columnLead } from '../constansts/customer-column.constansts'
import {
	columnsField,
	commonField,
	dealField,
	excelField,
	filterField,
	interestField,
	ownerField,
	settingField,
	tagField,
} from '../constansts/customer-fields-constansts'
import { excelOptions, imageState, objectLead } from '../constansts/customer-initial-data-constansts'
import { CustomerDetailViewModel, LeadCollapseTable, UpdateEmailConversation } from '../model/customer-models'
import { GoogleTagManagerService } from 'angular-google-tag-manager'
import { CustomerSharingService } from '../service/customer-sharing.service'
import { MailSharingService } from 'projects/email/src/app/shared/services/mail-sharing.service'
import { Location } from '@angular/common'
import { signal, Renderer2, ChangeDetectionStrategy } from '@angular/core'
import { CustomerTabMinisizeService } from '../service/customer-tab-minisize.service'
import { CustomerStateTab } from '../model'
import { ICustomerHeaderTab } from '../shared/interfaces/customer.interface'

export enum CustomerView {
	Customer,
	Contact,
}

export class CustomerFilterModel extends FilterDataSource {
	key: CustomerFilterData
	isActiveOwner?: any
}

interface GetCustomerData {
	source: 'getCustomer',
	scrollElement?: HTMLElement,
}

interface GetDataSeachMode {
	source: 'getDataSeachMode'
	filter: CustomerManagementFilterModel
}

type FetchData = GetCustomerData | GetDataSeachMode

@Component({
	selector: 'customer',
	templateUrl: './customer.component.html',
	styleUrls: [
		'./../../../../../src/assets/scss/Splitter.scss',
		'./customer.component.scss',
		'./../../../../../src/assets/scss/Accordion.scss',
		'./StatusColor.scss',
	],
	encapsulation: ViewEncapsulation.None,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerComponent extends BaseComponent implements OnInit, OnChanges, OnDestroy {
	@ViewChild('input') input: ElementRef
	@ViewChild('createTab') createTab: CustomerAddComponent
	@ViewChild('contactDetail') contactDetail: ContactComponent
	@ViewChild('contactAdd') contactAdd: ContactAddComponent
	@ViewChild('filterCustomerAge') filterCustomerAge: ElementRef
	@ViewChild('toggleCustomerAge') toggleCustomerAge: ElementRef

	@Output() readonly selected = new EventEmitter<ResEvent>()
	@Output() readonly selectedState = new EventEmitter<number>()

	@Input() customerId: number | string

	@Input() messageId: number
	@Input() filterInput: CustomerManagementFilterModel
	@Input() updateEmailConversation: UpdateEmailConversation

	@Input() isAllowMinimized = false

	private mapperListCustomer = new CustomerManagementMapper()
	private scrollHeight = 0
	private api1Subject = new BehaviorSubject<boolean>(false)
	private api2Subject = new BehaviorSubject<boolean>(false)
	private destroy$ = new Subject<void>()

	public isReloadDashboard = false
	public isLoadingMoreTop = true
	public isLoadingMoreBottom = true
	isLoadingCustomers = signal(false)
	public isSpinnerLeadTop = false
	public isSpinnerLeadBottom = false
	public isLoadingSkeletonLeads = true
	public isHoverAction = false
	public isShortFormat = false
	public isSelectedTab = false
	public isFilterContactOnly = false
	public isDragging = false
	public isStartDragging = false
	public isOpenContactDetail = true
	public isCollapseIcon = false
	public isHoverTab: boolean[] = []
	public onboardingCustomer = true
	public collapse = false
	public canCreateCustomer = false
	public canEditCustomer = false
	public canUseLeadManagement = false
	public canImport = false
	public createCustomerOpenned = true
	public collapseStates = [true, true]
	public cusLocation: any
	public columns = []
	public columnsDdlValue: number[] = []
	public columnsBottom = []
	public columnsBottomDdlValue: number[] = []
	public contacts: Contact[] = []
	public customer = new CustomerDetail()
	public ageRange: [number, number] = [0, 120]
	public range = [30, 90]
	public initialX: number
	public tabSelected = 0
	public mainTabSelected = 0
	public selectedCustomerTab = ''
	public hoverRowContactIndex: number = undefined
	public hoverRowCustomerIndex: number = undefined
	public hoverRowCustomerTopIndex: number = undefined
	public hoverRowCustomerBottomIndex: number = undefined
	public selectExpandContact: number = null

	//customer detail
	public isOpenedDetail = false
	public hidePopup = true
	public dataSource: CustomerDetailViewModel[] = []
	public viewCustomer: number | string

	// field
	public ownerField = ownerField
	public optionExcelFields = excelField
	public optionManageFields = commonField
	public columnsFields = columnsField
	public topicInterestFields = interestField
	public dealStageFields = dealField
	public filterFields = filterField
	filterToolbar = signal<CustomerFilterModel[]>(filterToolbar)
	public fieldsTags = tagField
	public settingFilter: any = settingField

	// columnTable
	public columnsLeadData = columnLead
	public columnsCommonData = columnCommon
	public columnsContract = columnContract

	// stateGroupTab
	public headerTab: ICustomerHeaderTab[] = headerTab

	// array
	public filterItems: any = {}

	public customerLeadTableTop: LeadCollapseTable = { ...objectLead }
	public customerLeadTableBottom: LeadCollapseTable = { ...objectLead }
	customers = signal<CustomerManagementViewModel[]>([])
	public newList: CustomerManagementViewModel[] = []
	public filterGroup? = []
	public probability: any[] = []
	public stateTab: any[] = []
	public stateSelected: any[] = []
	public ownerTypeFilter: number[] = []
	public optionExcel: any[] = excelOptions
	public emptyStateImgUrl = imageState
	public tags: Tag[] = []
	public cacheCollapse: any = {}

	skeletonRows = signal(10)

	stateTabs = signal<CustomerStateTab[]>([])
	filter = signal(new CustomerManagementFilterModel())

	private scriptElement: HTMLScriptElement

	private fetchDataSubject = new Subject<GetCustomerData | GetDataSeachMode>()

	private readonly debounceTimeMs = 300

	get CurrentTimes() {
		return new Date()
	}

	get CurrentView() {
		return CustomerView
	}

	get CustomerTab() {
		return CustomerTab
	}

	get CustomerState() {
		return CustomerState
	}

	get OwnerType() {
		return OwnerType
	}

	get CustomerFilterTypes() {
		return CustomerFilterTypes
	}

	get ConversationAction() {
		return ConversationAction
	}

	get Statuses() {
		return Statuses
	}

	get CustomerFilterData() {
		return CustomerFilterData
	}

	get STATUS_NAME() {
		return STATUS_NAME
	}

	get CustomerStatuses() {
		return CustomerStatuses
	}

	get MatchedType() {
		return MatchedType
	}

	get LeadState() {
		return LeadState
	}

	get StatesGroup() {
		return StatesGroup
	}

	get ProspectState() {
		return ProspectState
	}

	get DropdownSelectMode() {
		return DropdownSelectMode
	}

	get DateFormat() {
		return DateFormat
	}

	get BADGE_SIZE() {
		return BADGE_SIZE
	}

	get TabCategories() {
		return TabCategories
	}

	get TableCategories() {
		return TableCategories
	}

	get CurrentLang() {
		return BaseComponent.languages
	}

	tableIsLoading = computed(() => {
		return this.isLoadingCustomers() && this.customers()?.length === 0
	})

	get tableLeadIsEmpty() {
		return this.customerLeadTableTop?.data?.length !== 0 || this.customerLeadTableBottom?.data?.length !== 0
	}

	get isPromote() {
		return !this.canUseLeadManagement && this.headerTab[this.tabSelected].isLeadManagement
	}

	private readonly renderer = inject(Renderer2)
	private readonly customerTabMinisizeService = inject(CustomerTabMinisizeService)
	public frozenCols = [
		{
			columnId: 1,
			columnName: 'customerName',
			keyName: 'common_name',
			align: 'left',
			isActive: { All: false, Lead: false, Prospect: false, Customer: false },
			condition: [],
			width: '280px',
			minWidth: '280px',
			maxWidth: '280px'
		}
	]

	public cols = [
		{
			columnId: 1,
			columnName: 'contract',
			keyName: 'lead_column_contact',
			align: 'left',
			isShow: true,
			isActive: { All: true, Lead: true, Prospect: true, Customer: true },
			width: '132',
			minWidth: '132',
			condition: [],
		},
		{
			columnId: 2,
			columnName: 'dealStages',
			keyName: 'common_deal_stage_dealstage',
			align: 'left',
			isShow: true,
			isActive: { All: true, Lead: false, Prospect: true, Customer: true },
			width: '140.77',
			minWidth: '140.77',
			condition: [],
		},
		{
			columnId: 3,
			columnName: 'interests',
			keyName: 'common_customer_interestedin',
			align: 'left',
			isShow: true,
			isActive: { All: true, Lead: true, Prospect: true, Customer: true },
			width: '290',
			minWidth: '290',
			condition: [],
		},
		{
			columnId: 4,
			columnName: 'owners',
			keyName: 'common_customer_owner',
			align: 'left',
			isShow: true,
			isActive: { All: true, Lead: true, Prospect: true, Customer: true },
			width: '200',
			minWidth: '200',
			condition: [],
		},
		{
			columnId: 5,
			columnName: 'activityStats',
			keyName: 'common_customer_ongoing',
			align: 'left',
			isShow: true,
			isActive: { All: true, Lead: true, Prospect: true, Customer: true },
			width: '244.65',
			minWidth: '244.65',
			condition: [],
		},
		{
			columnId: 6,
			columnName: 'thisYearStats',
			keyName: 'common_customer_this_year',
			align: 'left',
			isShow: true,
			isActive: { All: true, Lead: false, Prospect: true, Customer: true },
			width: '136.81',
			minWidth: '136.81',
			condition: [],
		},
		{
			columnId: 7,
			columnName: 'dateFollowUp',
			orderKey: 'dateFollowUp',
			keyName: 'common_customer_next_followup',
			align: 'left',
			isShow: true,
			orderable: true,
			isActive: { All: true, Lead: true, Prospect: true, Customer: true },
			width: '149.73',
			minWidth: '149.73',
			condition: [],
		},
		{
			columnId: 8,
			columnName: 'dateAcquired',
			orderKey: 'dateAcquired',
			keyName: 'customer_age',
			align: 'left',
			isShow: true,
			orderable: true,
			isActive: { All: true, Lead: true, Prospect: true, Customer: true },
			width: '140',
			minWidth: '140',
			condition: [],
		},
		{
			columnId: 9,
			columnName: 'dateLatestUpdated',
			orderKey: 'dateLatestUpdated',
			keyName: 'common_customer_last_updated',
			align: 'left',
			isShow: true,
			orderable: true,
			isActive: { All: true, Lead: true, Prospect: true, Customer: true },
			width: '137',
			minWidth: '137',
			condition: [],
		},
		{
			columnId: 10,
			columnName: 'status',
			keyName: 'common_status',
			align: 'center',
			isShow: true,
			isActive: { All: true, Lead: true, Prospect: true, Customer: true },
			width: '90',
			minWidth: '90',
			condition: [],
		}
	]
	constructor(
		public elementRef: ElementRef,
		public phraseService: PhraseService,
		private userService: UserService,
		public _cdr: ChangeDetectorRef,
		private alertService: AlertDialogService,
		private _tagService: TagService,
		private CustomerManagementService: CustomerManagementService,
		private customerSharingService: CustomerSharingService,
		private _gtmService: GoogleTagManagerService,
		private mailCenter: MailSharingService,
		private location: Location,
	) {
		super(elementRef, phraseService, _cdr)
	}

	ngOnInit(): void {
		this.setDefaultCollapse()

		this.isDoneLoading$
			.pipe(
				takeUntil(this.destroy$),
				first((val) => val),
			)
			.subscribe(() => {
				if (BaseComponent.currentUsers) {
					this.getOnboarding()
					this.setPermission()

					this.canUseLeadManagement = /true/i.test(BaseComponent.currentUsers.preferences[Preferences.LeadManagement])
					const tabCount = this.filter()?.stateId === CustomerState.Lead ? 8 : 10
					this.isHoverTab = Array(tabCount).fill(false)
				}
				if (BaseComponent.applicationName) {
					this.setAgmMap()
				}

				this.setDefaultFilter()
				this.refreshColumn()
			})

		//table skeleton
		this.calculateSkeletonRows()

		this.fetchDataSubject
			.pipe(
				tap(() => this.isLoadingCustomers.set(true)),
				takeUntil(this.destroy$),
				debounceTime(this.debounceTimeMs),
				switchMap(async (dataSubject): 
					Promise<[FetchData, CustomerManagementViewModel[] | undefined]> => {
					if (dataSubject.source === 'getCustomer') {
						return [
							dataSubject,
							await this.getDataV2(dataSubject.scrollElement)
						]
					} else if (dataSubject.source === 'getDataSeachMode') {
						return [
							dataSubject,
							await this.getDataSearchMode(dataSubject.filter)
						]
					} 

					throw new Error('bug: getDataSearchMode found invalid source')
				}),
				catchError((err) => {
					console.error(err)
					return of(null)
				}),
			)
			.subscribe({
				next: async ([fetchData, result]) => {
					if (fetchData.source === 'getCustomer') {
						if (result) {
							this.updateCustomerData(result)
						}

						this.isLoadingCustomers.set(false)
					} else if (fetchData.source === 'getDataSeachMode') {
						if (this.filter()?.search) {
							this.selectNewExpandContact = this.initialContract(result)
						}
						this.customers.set(result)
						this.setDealStageAndFilterContact(result)
						this.isLoadingCustomers.set(false)
					}
				}
			})
	}

	ngOnChanges(changes: SimpleChanges): void {
		super.ngOnChanges(changes)
		if (changes?.filterInput?.currentValue) {
			this.filter.set(changes?.filterInput?.currentValue)
			this.getItemStorage()
		}

		if (changes?.updateEmailConversation?.currentValue) {
			const items = changes?.updateEmailConversation?.currentValue
			this.mailCenter.setConversationByItem(items)
		}

		this.customerSharingService.getReloadCustomer.pipe(takeUntil(this.destroy$)).subscribe((res) => {
			if (res) {
				this.customerSharingService.resetRelaodCustomer()
			}
		})

		if (changes?.isAllowMinimized?.currentValue) {
			this.customerTabMinisizeService.isAllowMinimized.set(changes?.isAllowMinimized?.currentValue)
		}

		if (changes?.customerId?.currentValue || changes?.messageId?.currentValue) {
			const customerId = changes?.customerId?.currentValue
			if (customerId) {
				this.openCustomerDetailDialog(customerId, this.messageId)
			}
		}
	}

	ngAfterViewInit(): void {
		this.fetchDataSubject.next({
			source: 'getCustomer'
		})
	}

	ngOnDestroy(): void {
		super.ngOnDestroy()
		this._mergeSubscription$?.unsubscribe()
		this.destroy$.next()
		this.destroy$.complete()
		this.api1Subject.complete()
		this.api2Subject.complete()

		if (this.scriptElement) {
			this.renderer.removeChild(document.head, this.scriptElement)
			this.scriptElement = null
		}
		this.renderer.removeChild(document.body, this.elementRef.nativeElement)
	}
	// ####################

	// @HostListener('window:beforeunload', ['$event'])
	// unloadNotification($event: BeforeUnloadEvent) {
	// 	this.handleCustomerDetailDailogClosed()
	// }

	setDefaultCollapse() {
		this.cacheCollapse[StatesGroup[StatesGroup.PendingFirstContact]] = [true, true]
		this.cacheCollapse[StatesGroup[StatesGroup.TodayFollowup]] = [true, true]
		this.cacheCollapse[StatesGroup[StatesGroup.NotFollowedup]] = [true, true]
	}

	setDefaultFilter(): void {
		this.filter.update((filter) => ({
			...filter,
			statuses: [1],
			followUpType: FollowUpType.All,
			actionState: ActionState.All,
			tabState: StatesGroup.All,
			pagelength: 20,
		}))
	}

	public toDate(date) {
		return new Date(date)
	}

	private _mergeSubscription$: Subscription
	public handleListenEvent() {
		if (this._mergeSubscription$) {
			this._mergeSubscription$.unsubscribe()
		}
		this._mergeSubscription$ = combineLatest([this.api1Subject, this.api2Subject])
			.pipe(delay(1000), takeUntil(this.destroy$))
			.subscribe(([api1Result, api2Result]) => {
				if (api1Result && api2Result) {
					this.isLoadingSkeletonLeads = false
					this._cdr.detectChanges()
				}
			})
	}

	public initialContract(array) {
		const searchText = this.filter()?.search.toLowerCase()
		const matchingCustomerIds = array
			.filter((cus) =>
				cus?.contacts?.some(
					(contact) =>
						contact?.contactName?.toLowerCase().includes(searchText) ||
						contact?.mobile?.toLowerCase().includes(searchText) ||
						contact?.email?.toLowerCase().includes(searchText) ||
						contact?.phone?.toLowerCase().includes(searchText),
				),
			)
			.map((cus) => cus.customerId)

		return matchingCustomerIds
	}

	onGetSearchDataMode(filter: CustomerManagementFilterModel): void {
		this.fetchDataSubject.next({
			source: 'getDataSeachMode', filter
		})
	}

	async getDataSearchMode(filter: CustomerManagementFilterModel): Promise<CustomerManagementViewModel[] | undefined> {
		try {
			let res = await this.CustomerManagementService.getCustomerManagement(filter)
			res = res?.map((item) => {
				return this.checkUserPermissionOnCustomer(item)
			})
			return res
		} catch (error: unknown) {
			console.log(error)
		}
	}

	private updateCustomerData(data: CustomerManagementViewModel[]): void {
		if (this.filter().stateId !== CustomerState.Lead) {
			if (this.filter()?.search) {
				this.selectNewExpandContact = this.initialContract(data)
			}
		}

		this.customers.set(data)
		this.setDealStageAndFilterContact(data)
	}

	private async getDataV2(element?: HTMLElement): Promise<CustomerManagementViewModel[] | undefined> {
		this.setGetDataFilter()

		const bypass = { ownerType: this.filter().ownerType, stateId: this.filter()?.stateId }
		localStorage.setItem('customer_management_filter', JSON.stringify(bypass))

		if (this.filter().stateId !== CustomerState.Lead) {
			this.resetLeadGroupCustomersData()
			return this.getCustomers()
		}

		if (!this.currentLeadTab()) {
			this.resetLeadGroupCustomersData()
			return this.getLeadCustomers()
		}

		this.customers.set([])
		this.isSpinnerLeadTop = true
		this.isSpinnerLeadBottom = true
		this.isFilterContactOnly = false

		if (!this.customerLeadTableTop) {
			this.customerLeadTableTop = { ...objectLead }
		}
		if (!this.customerLeadTableBottom) {
			this.customerLeadTableBottom = { ...objectLead }
		}

		if (!this.isLoadingMoreTop) {
			this.isSpinnerLeadTop = false
		}
		if (!this.isLoadingMoreBottom) {
			this.isSpinnerLeadBottom = false
		}

		const results = await Promise.all(this.getFetchingTopOrBottomTable())
		const topData = results?.[0] ?? { data: [], totalRecords: 0 }
		const bottomData = results?.[1] ?? { data: [], totalRecords: 0 }
		if (this.filter().tabState === StatesGroup.PendingFirstContact) {
			if (this.isLoadingMoreTop) {
				if (element && topData.data.length <= 0) {
					const scrollBounce = element.scrollTop / 2
					this.pageScrollHeight = element.scrollHeight - scrollBounce
				}

				this.isDisabledLoadTop = topData.data.length <= 0

				if (topData.data?.length > 0) {
					let newData = topData.data.map(this.mapperListCustomer.mapTo)
					newData = newData.map((item) => {
						return this.checkUserPermissionOnCustomer(item)
					})
					this.setTopLeadTableData({
						caption: 'lead_unassigned_title',
						total: topData.totalRecords,
						data: newData,
					})
					if (element) {
						this.scrollToTop(element)
					}
				}

				if (this.cacheCollapse[StatesGroup[StatesGroup.PendingFirstContact]][0]) {
					this.isLoadingMoreTop = bottomData.data?.length > 0
				} else {
					this.isLoadingMoreTop = false
				}

				this.setDealStageAndFilterContact(this.customerLeadTableTop?.data ?? [])
				this.isSpinnerLeadTop = false
				this.api1Subject.next(true)
			}
			if (this.isLoadingMoreBottom) {
				if (bottomData.data?.length <= 0) {
					this.isDisabledLoadBottom = true
				}

				if (bottomData.data?.length > 0) {
					let newData = bottomData?.data?.map(this.mapperListCustomer.mapTo)
					newData = newData.map((item) => {
						return this.checkUserPermissionOnCustomer(item)
					})

					this.setBottomLeadTableData({
						caption: 'lead_pending_first_contact_title',
						total: bottomData.totalRecords,
						data: newData,
					})
				}

				if (this.cacheCollapse[StatesGroup[StatesGroup.PendingFirstContact]][1]) {
					this.isLoadingMoreBottom = bottomData?.data?.length > 0
				} else {
					this.isLoadingMoreBottom = false
				}

				this.setDealStageAndFilterContact(this.customerLeadTableBottom?.data ?? [])
				this.isSpinnerLeadBottom = false
				this.api2Subject.next(true)
			}
		}

		if (this.filter().tabState === StatesGroup.TodayFollowup) {
			if (this.isLoadingMoreTop) {
				if (element && topData.data.length <= 0) {
					const scrollBounce = element.scrollTop / 2
					this.pageScrollHeight = element.scrollHeight - scrollBounce
				}

				this.isDisabledLoadTop = topData.data.length <= 0

				if (topData.data.length > 0) {
					let newData = topData?.data?.map(this.mapperListCustomer.mapTo)
					newData = newData.map((item) => {
						return this.checkUserPermissionOnCustomer(item)
					})
					this.setTopLeadTableData({
						caption: 'lead_overdue_title',
						data: newData,
						total: topData.totalRecords,
					})
					if (element) {
						this.scrollToTop(element)
					}
				}
				if (this.cacheCollapse[StatesGroup[StatesGroup.TodayFollowup]][0]) {
					this.isLoadingMoreTop = topData?.data?.length > 0
				} else {
					this.isLoadingMoreTop = false
				}
				this.setDealStageAndFilterContact(this.customerLeadTableTop?.data ?? [])
				this.isSpinnerLeadTop = false
				this.api1Subject.next(true)
			}
			if (this.isLoadingMoreBottom) {
				if (bottomData.data.length <= 0) {
					this.isDisabledLoadBottom = true
				}

				if (bottomData.data.length > 0) {
					let newData = bottomData.data.map(this.mapperListCustomer.mapTo)
					newData = newData.map((item) => {
						return this.checkUserPermissionOnCustomer(item)
					})

					this.setBottomLeadTableData({
						caption: 'lead_contact_today_title',
						data: newData,
						total: bottomData.totalRecords,
					})

					if (this.cacheCollapse[StatesGroup[StatesGroup.TodayFollowup]][1]) {
						this.isLoadingMoreBottom = bottomData.data.length > 0 ? true : false
					} else {
						this.isLoadingMoreBottom = false
					}

					this.setDealStageAndFilterContact(this.customerLeadTableBottom?.data ?? [])
					this.isSpinnerLeadBottom = false
					this.api2Subject.next(true)
				}
			}
		}

		if (this.filter().tabState === StatesGroup.NotFollowedup) {
			if (this.isLoadingMoreTop) {
				if (element && topData.data.length <= 0) {
					const scrollBounce = element.scrollTop / 2
					this.pageScrollHeight = element.scrollHeight - scrollBounce
				}

				this.isDisabledLoadTop = topData.data.length <= 0

				if (topData.data.length > 0) {
					let newData = topData.data.map(this.mapperListCustomer.mapTo)
					newData = newData.map((item) => {
						return this.checkUserPermissionOnCustomer(item)
					})

					this.setTopLeadTableData({
						caption: 'lead_not_follow_up_title',
						data: newData,
						total: topData.totalRecords,
					})

					if (element) {
						this.scrollToTop(element)
					}
				}

				if (this.cacheCollapse[StatesGroup[StatesGroup.NotFollowedup]][0]) {
					this.isLoadingMoreTop = topData?.data?.length > 0
				} else {
					this.isLoadingMoreTop = false
				}

				this.setDealStageAndFilterContact(this.customerLeadTableTop?.data ?? [])
				this.isSpinnerLeadTop = false
				this.api1Subject.next(true)
			}
			if (this.isLoadingMoreBottom) {
				if (bottomData.data.length <= 0) {
					this.isDisabledLoadBottom = true
				}
				if (bottomData.data.length > 0) {
					let newData = bottomData?.data?.map(this.mapperListCustomer.mapTo)
					newData = newData.map((item) => {
						return this.checkUserPermissionOnCustomer(item)
					})

					this.setBottomLeadTableData({
						caption: 'lead_pending_follow_up_title',
						data: newData,
						total: bottomData.totalRecords,
					})
				}

				if (this.cacheCollapse[StatesGroup[StatesGroup.NotFollowedup]][1]) {
					this.isLoadingMoreBottom = bottomData?.data.length > 0 ? true : false
				} else {
					this.isLoadingMoreBottom = false
				}
				this.setDealStageAndFilterContact(this.customerLeadTableBottom?.data ?? [])
				this.isSpinnerLeadBottom = false
				this.api2Subject.next(true)
			}
		}

		this.handleListenEvent()
		this._cdr.detectChanges()
	}

	private getFetchingTopOrBottomTable(): Promise<{
		data: CustomerManagementModel[]
		totalRecords: number
	}>[] {
		const promises: Promise<{
			data: CustomerManagementModel[]
			totalRecords: number
		}>[] = []
		if (this.filter().tabState === StatesGroup.PendingFirstContact) {
			if (this.isLoadingMoreTop) {
				promises.push(
					this.getLeadGroupCustomers({
						state: StatesGroup.Unassigned,
						skip: this.customerLeadTableTop?.data?.length ?? 0,
					}),
				)
			}
			if (this.isLoadingMoreBottom) {
				promises.push(
					this.getLeadGroupCustomers({
						state: StatesGroup.PendingFirstContact,
						skip: this.customerLeadTableBottom?.data?.length ?? 0,
					}),
				)
			}
		}
		if (this.filter().tabState === StatesGroup.TodayFollowup) {
			if (this.isLoadingMoreTop) {
				promises.push(
					this.getLeadGroupCustomers({
						state: StatesGroup.PendingUpdate,
						skip: this.customerLeadTableTop?.data?.length ?? 0,
					}),
				)
			}
			if (this.isLoadingMoreBottom) {
				promises.push(
					this.getLeadGroupCustomers({
						state: StatesGroup.TodayUpcomingFollowup,
						skip: this.customerLeadTableBottom?.data?.length ?? 0,
					}),
				)
			}
		}
		if (this.filter().tabState === StatesGroup.NotFollowedup) {
			if (this.isLoadingMoreTop) {
				promises.push(
					this.getLeadGroupCustomers({
						state: StatesGroup.NotRecentlyContacted,
						skip: this.customerLeadTableTop?.data?.length ?? 0,
					}),
				)
			}
			if (this.isLoadingMoreBottom) {
				promises.push(
					this.getLeadGroupCustomers({
						state: StatesGroup.Ongoing,
						skip: this.customerLeadTableBottom?.data?.length ?? 0,
					}),
				)
			}
		}
		return promises
	}

	private setTopLeadTableData(table: Omit<LeadCollapseTable, 'isView'>): void {
		this.customerLeadTableTop.caption = table.caption
		this.customerLeadTableTop.data = this.customerLeadTableTop.data.concat(table.data)
		this.customerLeadTableTop.total = table.total
		this.customerLeadTableTop.isView = this.customerLeadTableTop.data.length > 0
	}

	private setBottomLeadTableData(table: Omit<LeadCollapseTable, 'isView'>): void {
		this.columnsBottom[4].columnName = 'dateFollowUp'
		this.columnsBottom[4].orderKey = 'dateFollowUp'
		this.columnsBottom[4].keyName = 'lead_column_next_follow_up'

		this.customerLeadTableBottom.caption = table.caption
		this.customerLeadTableBottom.data = this.customerLeadTableBottom.data.concat(table.data)
		this.customerLeadTableBottom.total = table.total
		this.customerLeadTableBottom.isView = this.customerLeadTableBottom.data.length > 0
	}

	private setDealStageAndFilterContact(data: any[]) {
		this.setDealStage(data ?? [])
		this.isFilterContactOnly = this.filter()?.types?.length === 1 && this.filter()?.types[0] === CustomerType.Contact
	}

	private setGetDataFilter(): void {
		this.filter.update((filter) => {
			if (!CustomerState[filter?.stateId]) {
				filter.stateId = CustomerState.All
			}
			if (!filter.pagelength) {
				filter.pagelength = 20
			}
			filter.skip = this.customers().length
			if (filter?.age === -1 || !isNumber(filter?.age)) {
				delete filter.age
			}
			if (filter.search) {
				delete filter.orderBy
			}
			Object.keys(filter).forEach((key) => {
				if (this.settingFilter[key] && !this.settingFilter[key][CustomerState[filter?.stateId]]) {
					delete filter[key]
				}
			})
			return { ...filter }
		})
	}

	private checkUserPermissionOnCustomer(data: CustomerManagementViewModel): CustomerManagementViewModel {
		data.optionManageCustomer = []
		if (this.canEditCustomer) {
			data.optionManageCustomer.push({ value: 1, text: 'common_customer_edit_customer' })
		}
		if (data?.customerType === CustomerType.Business && this.canCreateCustomer) {
			data.optionManageCustomer.push({
				value: 2,
				text: 'common_add_contact',
			})
		}
		if (data?.owners?.length > 5) {
			const clone: unknown[] = structuredClone(data?.owners)
			data.owners = clone?.slice(0, 4)
			data.hideOwners = clone.slice(4)
		}
		return data
	}

	private resetLeadGroupCustomersData(): void {
		this.customerLeadTableTop = null
		this.customerLeadTableBottom = null
	}

	private async getCustomers(): Promise<CustomerManagementViewModel[]> {
		try {
			let res = await this.CustomerManagementService.getCustomerManagement(this.filter())
			if (!res) {
				return this.customers()
			}
			res = res?.map((item) => {
				return this.checkUserPermissionOnCustomer(item)
			})

			return [...this.customers(), ...res]
		} catch (error: unknown) {
			if (typeof error === 'object' && 'status' in error && typeof error.status === 'number') {
				await lastValueFrom(this.alertService.status(error.status))
			}
		}
	}

	private async getLeadCustomers(): Promise<CustomerManagementViewModel[]> {
		try {
			let res = await this.CustomerManagementService.getCustomerLeadManagement(this.filter())
			res = res?.map((item) => {
				return this.checkUserPermissionOnCustomer(item)
			})
			return [...this.customers(), ...res]
		} catch (error: unknown) {
			console.log(error)
			if (typeof error === 'object' && 'status' in error && typeof error.status === 'number') {
				await lastValueFrom(this.alertService.status(error.status))
			}
		}
	}

	private async getLeadGroupCustomers({
		state,
		skip,
	}: {
		state?: StatesGroup
		skip?: number
	}): Promise<{ data: CustomerManagementModel[]; totalRecords: number }> {
		try {
			const res = await firstValueFrom(
				this.CustomerManagementService.getCustomerLeadGroupManagement(this.filter(), skip),
			)
			if (res?.data?.length > 0) {
				res.data = res?.data?.map(this.mapperListCustomer.mapTo)
				res.data = res?.data?.map((item) => {
					return this.checkUserPermissionOnCustomer(item)
				})
			}
			return { data: res?.data ?? [], totalRecords: res.totalRecords ?? 0 }
		} catch (error: unknown) {
			console.log(error)
			if (typeof error === 'object' && 'status' in error && typeof error.status === 'number') {
				await lastValueFrom(this.alertService.status(error.status))
			}
		}
	}

	isCustomerIdInSelectNewExpandContact(customerId): boolean {
		return this.selectNewExpandContact.findIndex((item) => item === customerId) !== -1
	}

	setFilterToolbar(key, dataSource: any[]): void {
		this.filterToolbar.update((filters) => {
			return filters.map((filter) => {
				if (key === filter.key) {
					filter.dataSource = dataSource
				}
				return filter
			})
		})
	}

	reloadCustomer(): void {
		this.scrollHeight = window.innerHeight - 185
		this.pageScrollHeight = window.innerHeight - 185
		this.customers.set([])
		this.restoreData() //searchmode default
		this.resetLeadData()
		this.getTags()
		this.fetchDataSubject.next({
			source: 'getCustomer'
		})
	}

	public resetLeadData() {
		this.isDisabledLoadTop = false
		this.isDisabledLoadBottom = false
		this.customerLeadTableTop = { ...objectLead }
		this.customerLeadTableBottom = { ...objectLead }
	}

	public reloadTable() {
		this.onFilterChange()
	}

	public openEditContact(contact: Contact) {
		this.contactAdd?.openClick({ contactId: contact?.contactId })
	}

	public openAddContact(customer: CustomerManagementViewModel) {
		this.contactAdd?.openClick({ customerId: customer?.customerId })
	}

	public getItemStorage() {
		const storedCollapse = JSON.parse(localStorage.getItem('customer_collapse_state'))
		if (storedCollapse) this.cacheCollapse = storedCollapse
	}

	public setAgmMap(): void {
		// Check if the script is already loaded by checking window.google
		if (typeof window['google'] === 'object' && typeof window['google'].maps === 'object') {
			console.log('Google Maps API is already loaded')
			return
		}

		// Optional: Check sessionStorage or localStorage to see if the script was previously loaded
		// if (sessionStorage.getItem('agmScriptLoaded')) {
		// 	console.log('AGM script is already loaded and cached in sessionStorage.')
		// 	return
		// }

		// Create the script tag and load Google Maps API
		const agmScript: HTMLScriptElement = document.createElement('script')
		agmScript.type = 'text/javascript'
		const app = (<string>BaseComponent.applicationName).toLowerCase()
		agmScript.src =
			'https://maps.googleapis.com/maps/api/js?key=' +
			environment.agmApiKey[app] +
			'&libraries=places,marker&language=en&loading=async'
		agmScript.async = true

		// Mark script as loaded in sessionStorage
		agmScript.onload = () => {
			console.log('Google Maps API script loaded successfully.')
			// sessionStorage.setItem('agmScriptLoaded', 'true')
		}

		this.scriptElement = agmScript
		this.renderer.appendChild(document.head, this.scriptElement)
	}

	public setPermission() {
		const permissions = BaseComponent.currentUsers.permissions
		if (permissions.indexOf(Permissions.Customer_View) === -1) {
			this.open(ResEventType.Home)
		}
		this.canImport = permissions.indexOf(Permissions.ManageConfiguration) > -1
		this.canCreateCustomer = permissions.indexOf(Permissions.Customer_Add) > -1
		this.canEditCustomer = permissions.indexOf(Permissions.Customer_Edit) > -1
	}

	public getOnboarding() {
		this.userService
			.GetCustomerOnboarding(BaseComponent.currentUsers.userId)
			.toPromise()
			.then((res) => {
				this.onboardingCustomer = res.isCompleted || false
			})
	}

	currentLeadTab = computed(
		() =>
			this.filter().tabState === StatesGroup.PendingFirstContact ||
			this.filter().tabState === StatesGroup.TodayFollowup ||
			this.filter().tabState === StatesGroup.NotFollowedup,
	)

	public setDealStage(array) {
		array.map((data) => {
			if (data?.dealStages?.length > 0) {
				data?.dealStages?.map((item) => {
					if (Number(item?.dealStageId) === Statuses.DealOpen) item['dealStageName'] = 'common_status_dealopen'
				})
			}
		})
	}

	cacheTabIndex: number
	cacheBadge: boolean[] = []

	isSearchMode = signal(false)

	showLeadDashboard = computed(
		() =>
			CustomerState.Lead === this.filter().stateId &&
			StatesGroup.All === this.filter().tabState &&
			!this.isSearchMode(),
	)

	searchData(): void {
		this.customers.set([])
		this.scrollHeight = window.innerHeight - 185
		this.getTags()
		this.fetchDataSubject.next({
			source: 'getCustomer',
		})
	}

	public onSelectOwnerType() {
		this.filter.update((filter) => {
			filter.ownerType = filter?.ownerType ?? OwnerType.Me
			if (filter.ownerType === OwnerType.Me) {
				filter.owners = []
			}
			return { ...filter }
		})
	}

	public onCheckSelected(e?) {
		this.isSelectedTab = e
	}

	public onSelectTab(e: { index: number; name: string }) {
		const i = e?.index ?? 0
		const state = this.headerTab[i].id ?? 0

		// LoadingState
		this.selectNewExpandContact = []
		this.filter.update((filter) => {
			this.tabSelected = this.headerTab?.findIndex((tab) => tab?.id === filter?.stateId) ?? i
			filter.tabState = 0
			filter.stateId = this.isSelectedTab ? state : (filter?.stateId ?? CustomerState.All)
			filter.ownerType = filter?.ownerType ?? OwnerType.Me
			this.onSelectedFilter('ownerType', filter.ownerType)
			return { ...new CustomerManagementFilterModel(), ...filter }
		})
		this.mainTabSelected = 0
		this.isHoverTab = this.isHoverTab.map((_, i) => this.mainTabSelected === i)
		this.filterItems = {}

		this.selectedState.emit(e.index)
		this.refreshColumn()
	}

	private customerSelected() {
		const url = this.location.path()
		let regex = /\/customer\/(\w+)/
		return url.match(regex)
	}

	onSelectedFilter(key: string, value: number): void {
		this.isLoadingMoreTop = true
		this.isLoadingMoreBottom = true
		this.isLoadingSkeletonLeads = true
		this.selectNewExpandContact = []
		this.filter.update((filter) => ({
			...filter,
			[key]: value,
			...(key === 'ownerType' && {
				owners: [],
			}),
		}))
		this.onFilterChange()
	}

	public refreshColumn() {
		const filterStateId = this.filter()?.stateId
		const filteredColumns =
			this.filter()?.stateId === CustomerState.Lead ? this.columnsLeadData : this.columnsCommonData
		this.columns = filteredColumns.filter((s) => s.isActive[CustomerState[filterStateId]])
		this.columnsBottom = JSON.parse(JSON.stringify(this.columns))
		this.setFilterToolbar(CustomerFilterData.ColumnCustomer, this.columns)
		this.setFilterToolbar(CustomerFilterData.ColumnCustomer, this.columnsBottom)
		this.columnsDdlValue = this.columns.map((s) => s.columnId)
		this.columnsBottomDdlValue = this.columnsBottom.map((s) => s.columnId)
		this._cdr.detectChanges()
	}

	public onSelectedColumn(value: number[]) {
		this.columnsDdlValue = value ?? []
		this.columns.forEach((s) => {
			s.isShow = value.findIndex((a) => a === s.columnId) > -1
		})
	}

	private compareMainTab(stateId, tabId, index): string {
		let eventName = ''

		switch (stateId) {
			case CustomerState.All: {
				const tabIdAllToEventMap = {
					[StatesGroup.All]: 'customer_all_all_tab',
					[StatesGroup.Unassigned]: 'customer_all_unassigned_tab',
					[StatesGroup.OpenDeals]: 'customer_all_open_deal_tab',
					[StatesGroup.UpcomingFollowUp]: 'customer_all_upcoming_tab',
					[StatesGroup.PendingUpdate]: 'customer_all_pending_update_tab',
					[StatesGroup.Ongoing]: 'customer_all_ongoing_tab',
					[StatesGroup.NotRecentlyContacted]: 'customer_all_not_recently_contacted_tab',
					[StatesGroup.IncompleteQSO]: 'customer_all_incomplete_qso_tab',
				}

				eventName = tabIdAllToEventMap[tabId]
				break
			}
			case CustomerState.Lead: {
				const tabIdLeadToEventMap = {
					[StatesGroup.All]: 'customer_lead_all_tab',
					[StatesGroup.PendingFirstContact]: 'customer_lead_pending_first_contact_tab',
					[StatesGroup.TodayFollowup]: 'customer_lead_to_contact_today_tab',
					[StatesGroup.NotFollowedup]: 'customer_lead_not_followed_up_tab',
					[StatesGroup.Planned]: 'customer_lead_planned_tab',
					[StatesGroup.Unqualified]: 'customer_lead_unqualified_tab',
				}

				eventName = tabIdLeadToEventMap[tabId]
				break
			}
			case CustomerState.Prospect: {
				const tabIdProspectToEventMap = {
					[StatesGroup.All]: 'customer_prospect_all_tab',
					[StatesGroup.OpenDeals]: 'customer_prospect_open_deal_tab',
					[StatesGroup.UpcomingFollowUp]: 'customer_prospect_upcoming_tab',
					[StatesGroup.PendingUpdate]: 'customer_prospect_pending_update_tab',
					[StatesGroup.Ongoing]: 'customer_prospect_ongoing_tab',
					[StatesGroup.NotRecentlyContacted]: 'customer_prospect_not_recently_contacted_tab',
					[StatesGroup.IncompleteQSO]: 'customer_prospect_incomplete_qso_tab',
					[StatesGroup.Missed]: 'customer_prospect_missed_tab',
				}

				eventName = tabIdProspectToEventMap[tabId]
				break
			}
			case CustomerState.Customer: {
				const tabIdCustomerToEventMap = {
					[StatesGroup.All]: 'customer_customer_all_tab',
					[StatesGroup.OpenDeals]: 'customer_customer_open_deal_tab',
					[StatesGroup.UpcomingFollowUp]: 'customer_customer_upcoming_tab',
					[StatesGroup.PendingUpdate]: 'customer_customer_pending_update_tab',
					[StatesGroup.Ongoing]: 'customer_customer_ongoing_tab',
					[StatesGroup.NotRecentlyContacted]: 'customer_customer_not_recently_contacted_tab',
					[StatesGroup.IncompleteQSO]: 'customer_customer_incomplete_qso_tab',
				}

				eventName = tabIdCustomerToEventMap[tabId]
				break
			}
			default:
				eventName = ''
		}

		return eventName
	}

	public onSelectMainTab(stateId?: number, index?: number) {
		this.filter.update((filter) => {
			filter.tabState = stateId
			return { ...filter }
		})
		this.selectNewExpandContact = []
		this.isLoadingMoreTop = true
		this.isLoadingMoreBottom = true
		this.isLoadingSkeletonLeads = true
		this.isHoverTab = this.isHoverTab.map((_, i) => index === i)
		const eventName = this.compareMainTab(this.filter().stateId, stateId, index)
		this.mixpanelEventName(eventName)
		this.reloadCustomer()
	}

	public createCustomer(customer = null) {
		this.createCustomerOpenned = true
		if (this.createTab) {
			this.mixpanelEventName('customer_create_customer_main')
			this.createTab.toggleSidebar(customer)
		}
	}

	public closeOnboarding() {
		this.onboardingCustomer = true
	}

	// ------------------------Customer Detail Dialog----------------------
	openCustomerDetail(customer: CustomerManagementViewModel): void {
		this.openCustomerDetailDialog(customer?.customerId)
	}

	private openCustomerDetailDialog(customerId: number, messageId?: number): void {
		this.CustomerManagementService.openCustomerDetailDialog(customerId, messageId)
	}
	// ------------------------Customer Detail Dialog----------------------

	public selectCustomerTab(tab) {
		this.selectedCustomerTab = tab
	}

	public sortingBy(col: columnModel, event) {
		this.columns = this.columns?.map((col) => {
			col['sortType'] = null
			return col
		})
		col.sortType = event.orderBy || 'ASC'
		this.filter.update((filter) => {
			filter.orderBy = `${event.key} ${event.orderBy}` || 'ASC'
			return { ...filter }
		})
		this.isLoadingMoreTop = true
		this.isLoadingMoreBottom = true
		this.isLoadingSkeletonLeads = true
		this.reloadCustomer()
	}

	onScroll(e: Event) {
		const element = e.target as HTMLElement
		if (
			this.scrollHeight < element.scrollHeight &&
			element.offsetHeight + element.scrollTop + 300 > element.scrollHeight
		) {
			this.scrollHeight = element.scrollHeight
			if (this.customers()?.length > 0) {
				this.fetchDataSubject.next({
					source: 'getCustomer',
				})
			}
		}
		this._cdr.detectChanges()
	}

	public openImportFileCustomer() {
		this.open(ResEventType.ImportFileCustomer)
	}

	public openContactDetail(contactId, customerId) {
		if (this.isOpenContactDetail) {
			this.contactDetail.onOpenClick(contactId, customerId)
		}
		this.isOpenContactDetail = true
		this._cdr.detectChanges()
	}

	async getTags(): Promise<void> {
		try {
			const res = await firstValueFrom(this._tagService.GetTagsAll())
			this.tags = res.data
		} catch (error: unknown) {
			console.log(error)
		}
	}

	getTextFilterAgerange(): string {
		if (this.filter()?.agerange?.from && this.filter()?.agerange.to) {
			const text = this.filter().agerange.from + '-' + this.filter().agerange.to
			return text + ' ' + this.phraseService.translate('common_month', BaseComponent.languages, PhraseProject.Venio)
		}
		return ''
	}

	// customer table common - hover
	public onActionIcon(event) {
		event.stopPropagation()
		this.isHoverAction = true
	}

	public onMouseLeaveHoverRows(category, index) {
		if (this.isHoverAction === false) {
			switch (category) {
				case TableCategories.top:
					this.hoverRowCustomerTopIndex = undefined
					break
				case TableCategories.bottom:
					this.hoverRowCustomerBottomIndex = undefined
					break
				default:
					this.hoverRowCustomerIndex = undefined
					break
			}
		} else {
			this.hoverRowCustomerIndex = index
		}
	}

	public onMouseEnterHoverRows(category, index) {
		this.isHoverAction = false
		switch (category) {
			case TableCategories.top:
				this.hoverRowCustomerTopIndex = index
				break
			case TableCategories.bottom:
				this.hoverRowCustomerBottomIndex = index
				break
			default:
				this.hoverRowCustomerIndex = index
				break
		}
	}

	public resetHighlightRow() {
		this.hoverRowContactIndex = -1
	}

	public highlightContactRow(index) {
		this.hoverRowContactIndex = index
	}

	public onSelectDdlOption(e?, customer?: CustomerManagementViewModel) {
		if (e?.value === 1) {
			//Edit Customer
			this.createCustomer(customer)
		} else if (e?.value === 2) {
			//Create contact
			this.openAddContact(customer)
		}
	}

	public selectNewExpandContact = []
	public expandContact(customerId) {
		const index = this.selectNewExpandContact.indexOf(customerId)
		if (index === -1) {
			this.selectNewExpandContact.push(customerId)
		} else {
			this.selectNewExpandContact.splice(index, 1)
		}
	}

	public toTel(phone, event) {
		event.stopPropagation()
		if (this.isOpenContactDetail) {
			window.open('tel://' + phone, '_blank')
		}
		this.isOpenContactDetail = true
	}

	public toEmail(email, event) {
		event.stopPropagation()
		if (this.isOpenContactDetail) {
			window.open('mailto:' + email, '_blank')
		}
		this.isOpenContactDetail = true
	}

	updateMainTabs(index: number): void {
		this.pageScrollHeight = window.innerHeight - 185
		this.mainTabSelected = index
		this.isHoverTab = this.isHoverTab.map((_, i) => index === i)
		this.isLoadingSkeletonLeads = true
		this.isLoadingMoreTop = true
		this.isLoadingMoreBottom = true
		this.resetLeadData()
		this.fetchDataSubject.next({
			source: 'getCustomer',
		})
	}

	onToggleCollapse(i: number): void {
		if (i === 0) {
			this.isLoadingMoreTop = !this.cacheCollapse[StatesGroup[this.filter().tabState]][i] ? true : false
		} else {
			this.isLoadingMoreBottom = !this.cacheCollapse[StatesGroup[this.filter().tabState]][i] ? true : false
		}

		this.cacheCollapse[StatesGroup[this.filter().tabState]][i] =
			!this.cacheCollapse[StatesGroup[this.filter().tabState]][i]
		localStorage.setItem('customer_collapse_state', JSON.stringify(this.cacheCollapse))
	}

	restoreData(): void {
		this.isSearchMode.set(false)
		this.filter.update((filter) => {
			filter.search = ''
			return { ...filter }
		})
	}
	// DEVZONE

	private pageScrollHeight = 0
	private isDisabledLoadTop = false
	private isDisabledLoadBottom = false

	public onScrollWithLead(e: Event) {
		//disable scroll loding ..
		if (this.isDisabledLoadTop && this.isDisabledLoadBottom) return

		if (this.currentLeadTab()) {
			const element = e.target as HTMLElement
			if (element.scrollHeight === element.offsetHeight) return
			if (
				this.pageScrollHeight < element.scrollHeight &&
				element.offsetHeight + element.scrollTop + 100 > element.scrollHeight
			) {
				this.pageScrollHeight = element.scrollHeight
				const dataTop = this.customerLeadTableTop?.data?.length
				const dataBottom = this.customerLeadTableBottom?.data?.length
				const collapseState = this.cacheCollapse[StatesGroup[this.filter().tabState]]

				if (collapseState[0] && collapseState[1]) {
					if (this.isDisabledLoadTop === false && dataTop > 0 && dataBottom > 0) {
						this.isLoadingMoreTop = true
						this.isLoadingMoreBottom = false
					} else {
						this.isLoadingMoreTop = false
						this.isLoadingMoreBottom = true
					}
				} else {
					if (collapseState[0]) {
						this.isLoadingMoreTop = true
						this.isLoadingMoreBottom = false
					}

					if (collapseState[1]) {
						this.isLoadingMoreTop = false
						this.isLoadingMoreBottom = true
					}
				}
				this.fetchDataSubject.next({ 
					source: 'getCustomer', 
					scrollElement: element
				})
			}
		}
	}

	public onSuccessEmit(event) {
		this.isReloadDashboard = true
		this.reloadTable()
	}

	async onEditChange(data: { customerId?: number; customerType?: number; owners?: any }): Promise<void> {
		const indexCustomers = this.customers()?.findIndex((value) => value.customerId === data.customerId)
		if (indexCustomers === -1) {
			return
		}
		if (data.customerType !== this.customers()[indexCustomers].customerState) {
			this.customers.update((customers) => {
				customers.splice(indexCustomers, 1)
				return customers
			})
			return
		}
		const filter: CustomerManagementWithByIdModel = new CustomerManagementWithByIdModel()
		filter.stateId = this.filter()?.stateId ?? CustomerState.All
		filter.statuses = [1]
		filter.followUpType = 0
		filter.actionState = 0
		filter.tabState = this.filter()?.tabState ?? 0
		filter.ownerType = this.filter()?.ownerType ?? OwnerType.Me
		filter.owners = []
		filter.search = ''
		filter.pagelength = 20
		filter.skip = 0
		filter.customerId = data.customerId

		try {
			const result = await lastValueFrom(this.CustomerManagementService.getCustomerEditWithById(filter))
			if (!result[0]?.customerId) return
			result[0].optionManageCustomer = this.customers()[indexCustomers].optionManageCustomer
			if (this.filter().tabState !== StatesGroup.All) {
				if (data.owners === undefined && result[0].owners !== data.owners) {
					this.customers.update((customers) => {
						customers.splice(indexCustomers, 1)
						return customers
					})
					return
				}
			}
			this.customers.update((customers) => {
				customers[indexCustomers] = result[0]
				return customers
			})
			this.setDealStage(this.customers())
		} catch (error: unknown) {
			if (typeof error === 'object' && 'status' in error && typeof error.status === 'number') {
				await lastValueFrom(this.alertService.status(error.status))
			}
		}
	}

	private scrollToTop(element): Observable<void> {
		return from(
			new Promise<void>((resolve) => {
				const scrollBounce = element.scrollTop / 2
				this.pageScrollHeight = element.scrollHeight - scrollBounce
				element.scrollTo({
					top: scrollBounce,
				})
				element.addEventListener('scroll', function onScroll() {
					if (scrollBounce < element.scrollHeight) {
						element.removeEventListener('scroll', onScroll)
						resolve()
					}
				})
			}),
		)
	}

	// private getCustomerName(customer: CustomerManagementViewModel) {
	// 	return this.CurrentLang === LANGUAGE_KEY.TH
	// 		? customer.customerName
	// 		: customer.customerNameEN || customer.customerName
	// }

	public mixpanelEventName(eventName) {
		this._gtmService.pushTag({ event: eventName })
	}

	@HostListener('window:resize')
	onResize(): void {
		this.calculateSkeletonRows()
	}

	private calculateSkeletonRows(): void {
		const rowHeight = 65
		const availableHeight = window.innerHeight - 222
		this.skeletonRows.set(Math.floor(availableHeight / rowHeight))
	}

	onFilterChange(): void {
		this.reloadCustomer()
	}
}
